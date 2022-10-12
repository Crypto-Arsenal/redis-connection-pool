"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConnectionPool = void 0;
/**
 * redis-connection-pool
 *
 * copyright 2012 - 2022 Nick Jennings (https://github.com/silverbucket)
 *
 * licensed under the MIT license.
 * See the LICENSE file for details.
 *
 * The latest version can be found here:
 *
 *   https://github.com/silverbucket/node-redis-connection-pool
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */
const redis_1 = require("redis");
const generic_pool_1 = require("generic-pool");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)("redis-connection-pool");
const connectionPools = new Map();
/**
 * Function: redisConnectionPoolFactory
 *
 * A high-level redis management object. It manages a number of connections in
 * a pool, using them as needed and keeping all aspects of releasing active
 * connections internal to the object, so the user does not need to worry about
 * forgotten connections leaking memory and building up over time.
 *
 * Parameters:
 *
 *   uid - (string) - Unique identifier to retrieve an existing instance from
 *                    elsewhere in an application. If left undefined, one will
 *                    be generated automatically and available via the `uid`
 *                    property of the returned object.
 *
 *   cfg - (object) - A series of configuration parameters to be optionally
 *                    passed in and used during initialization of the object.
 *
 *
 *   cfg.max_clients - (number) - Max clients alive in the connection pool at
 *                                once. (default: 30)
 *
 *   cfg.redis - (object) - A redis config object
 *
 * Returns:
 *
 *   A RedisConnectionPool object
 */
function redisConnectionPoolFactory(uid, cfg = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        let pool;
        if (!connectionPools.has(uid)) {
            pool = new RedisConnectionPool(cfg);
            connectionPools.set(uid, pool);
            yield pool.init();
        }
        else {
            pool = connectionPools.get(uid);
        }
        return pool;
    });
}
exports.default = redisConnectionPoolFactory;
/**
 * RedisConnectionPool
 */
class RedisConnectionPool {
    constructor(cfg = {}) {
        this.max_clients = 5;
        // @ts-ignore
        this.initializing = false;
        this.max_clients = cfg.max_clients || this.max_clients;
        this.redis = cfg.redis;
    }
    /**
     * Execute a redis BLPOP command
     *
     * @param key - The list key
     */
    blpop(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("BLPOP", key);
        });
    }
    /**
     * Execute a redis BRPOP command
     *
     * @param key - The list key
     */
    brpop(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("BRPOP", key);
        });
    }
    /**
     * Execute a redis DEL command
     *
     * @param key - The key of the value you wish to delete
     */
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.singleCommand("DEL", [key]));
        });
    }
    /**
     * Execute a redis EXPIRE command
     *
     * @param key - A key to assign value to
     * @param ttl - TTL in seconds
     */
    expire(key, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.singleCommand("EXPIRE", [key, ttl]));
        });
    }
    /**
     * Execute a redis GET command
     *
     * @param key - The key of the value you wish to get
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("GET", key);
        });
    }
    /**
     * Execute a redis HDEL command
     *
     * @param key - The key of the value you wish to delete
     * @param fields - Array of additional field names to be deleted
     */
    hdel(key, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.singleCommand("HDEL", [key].concat(fields)));
        });
    }
    /**
     * Execute a redis HGET command
     *
     * @param key - The key of the hash you wish to get
     * @param field - The field name to retrieve
     */
    hget(key, field) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("HGET", key, field);
        });
    }
    /**
     * Execute a redis HGETALL command
     *
     * @param key - The key of the hash you wish to get
     */
    hgetall(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("HGETALL", key);
        });
    }
    /**
     * Execute a redis HSET command
     *
     * @param key - A key to assign the hash to
     * @param field - Name of the field to set
     * @param data - Value to assign to hash
     */
    hset(key, field, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            const res = client.HSET(key, field, data);
            yield this.pool.release(client);
            return res;
        });
    }
    /**
     * Execute a redis INCR command
     *
     * @param key - A key whose value you wish to increment
     */
    incr(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("INCR", key);
        });
    }
    /**
     * Initializes the Redis connection pool, connecting to redis.
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.pool = (0, generic_pool_1.createPool)({
                create: function () {
                    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        log("create");
                        if (this.initializing) {
                            log("Create method already called. (Redis config error? " +
                                "or maybe you forgot to await the init function?)");
                            throw Error("Create method already called. (Redis config error? " +
                                "or maybe you forgot to await the init function?)");
                        }
                        else {
                            this.initializing = true;
                        }
                        const client = (0, redis_1.createClient)(this.redis);
                        client.on("error", (err) => {
                            reject(err);
                        });
                        client.on("ready", () => {
                            log("ready");
                        });
                        log("connecting");
                        yield client.connect();
                        this.initializing = false;
                        // @ts-ignore
                        resolve(client);
                    }));
                },
                destroy: (client) => __awaiter(this, void 0, void 0, function* () {
                    yield client.quit();
                }),
            }, {
                max: this.max_clients,
            });
        });
    }
    /**
     * Execute a redis KEYS command
     *
     * @param key - The prefix of the keys to return
     */
    keys(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.singleCommand("KEYS", [key]));
        });
    }
    /**
     * Execute a redis LPUSH command
     *
     * @param key - The list key
     * @param data - Value to assign to the list
     */
    lpush(key, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            const res = client.LPUSH(key, data);
            yield this.pool.release(client);
            return res;
        });
    }
    /**
     * Execute a redis RPUSH command
     *
     * @param key - The list key
     * @param data - Value to assign to the list
     */
    rpush(key, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            const res = client.RPUSH(key, data);
            yield this.pool.release(client);
            return res;
        });
    }
    /**
     * Sends an explicit command to the redis server. Helpful for all the commands in redis
     * that aren't supported natively by this pool API.
     *
     * @param command_name - Name of redis command to execute
     * @param args - List of arguments for the redis command
     *
     * @example
     *
     *  sendCommand('ECHO', ['Hello Redis'] )
     *
     */
    sendCommand(command_name, args) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.singleCommand(command_name, args);
        });
    }
    /**
     * Execute a redis SET command
     *
     * @param key - A key to assign value to
     * @param data - Value to assign to key
     * @param ttl - TTL (Time to Live) in seconds
     */
    set(key, data, ttl = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            const res = client.SET(key, data, { EX: ttl });
            yield this.pool.release(client);
            return res;
        });
    }
    /**
     * Drain the pool and close all connections to Redis.
     */
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pool.drain();
            yield this.pool.clear();
        });
    }
    /**
     * Execute a redis TTL command
     *
     * @param {string} key - A key whose TTL(time-to-expire) will be returned
     */
    ttl(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getFuncs("TTL", key);
        });
    }
    singleCommand(funcName, functionParams = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            const res = yield client[funcName](...functionParams);
            yield this.pool.release(client);
            return res;
        });
    }
    getFuncs(funcName, key, field = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.acquire();
            let res;
            if (funcName === "GET" ||
                funcName === "HGETALL" ||
                funcName === "TTL" ||
                funcName === "INCR") {
                res = yield client[funcName](key);
            }
            else if (funcName === "BLPOP" || funcName === "BRPOP") {
                res = yield client[funcName](key, 0);
            }
            else if (funcName === "HGET") {
                res = yield client.HGET(key, field);
            }
            yield this.pool.release(client);
            return res;
        });
    }
}
exports.RedisConnectionPool = RedisConnectionPool;
//# sourceMappingURL=/index.js.map