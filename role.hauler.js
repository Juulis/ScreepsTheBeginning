var roleHauler = {
    run: function (creep) {
        // create a cleaner to take care of dropped energy
        const totalCleaners = creep.room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role === "hauler" && c.memory.cleaner === true}).length;
        if (Memory.debug) console.log("cleaners", totalCleaners);
        if (totalCleaners < 1 && !creep.memory.cleaner) {
            creep.memory.cleaner = true;
        }
        // create a storageHauler to take care of energy transfer storage -> spawn/extensions
        const storageHaulers = creep.room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role === "hauler" && c.memory.storageHauler});
        const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role === "hauler"});
        if (!creep.memory.cleaner && storageHaulers.length < 1 && haulers.length > 3) {
            creep.memory.storageHauler = true;
        }

        // if empty
        if (creep.memory.delivering && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.delivering = false;
        }
        // if full
        if (!creep.memory.delivering && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.delivering = true;
        }

        // hantera remote hauling
        if (creep.memory.role === "remoteHauler") {
            const sourceId = creep.memory.source;
            const sourceData = Memory.sources[sourceId];
            const sourceRoom = sourceData.roomName;
            const mainRoom = creep.memory.mainRoom;
            const roomObj = Game.rooms[sourceRoom];
            const isOwned = roomObj.controller.my;
            const hasSpawn = roomObj.find(FIND_MY_SPAWNS).length > 0;

            if (!isOwned && !hasSpawn) {
                if (!creep.memory.delivering) {

                    // gå till rätt rum först
                    if (container && creep.room.name !== sourceRoom) {
                        creep.say("🚚➡️🌍");
                        creep.moveTo(new RoomPosition(25, 25, sourceRoom));
                        return;
                    }

                    // hitta container nära source
                    const source = Game.getObjectById(sourceId);
                    const container = source.pos.findInRange(FIND_STRUCTURES, 1)
                        .find(s => s.structureType === STRUCTURE_CONTAINER);


                    if (container && container.store[RESOURCE_ENERGY] > 0) {
                        creep.say("🚚🔋");
                        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                        }
                        return;
                    }

                    // fallback: dropped energy
                    const dropped = source.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0];
                    if (dropped) {
                        creep.say("🚚🧹");
                        if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(dropped);
                        }
                        return;
                    }

                    creep.say("⛏️⏳");
                } else {
                    // gå hem först
                    if (creep.room.name !== mainRoom) {
                        creep.say("🚚🌍➡️🏠");
                        creep.moveTo(new RoomPosition(25, 25, mainRoom));
                    }
                    return;
                }
            }
        }

        // === STEG 1: Bestäm om vi ska hämta eller lämna ===
        if (!creep.memory.delivering) {
            // Hämta energi

            // 1. Dropped energy (snabbast)
            let dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50
            });

            // CLEANER
            if (creep.memory.cleaner && dropped) {
                // detta försöket gick inte så bra, mer jobb behövs
                // const otherHaulersNearby = dropped.pos.findInRange(FIND_MY_CREEPS, 3, {
                //     filter: c => c.memory.role === 'hauler' && c.id !== creep.id
                // });
                // if (!otherHaulersNearby) {
                creep.say("🚚🧹⚡");
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
                return;
                // }
            }

            // 2. Container
            let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] >= 50   // undvik tomma
            });
            let storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE &&
                    s.store[RESOURCE_ENERGY] >= 50   // undvik tomma
            });

            // STORAGE HAULER
            if (creep.memory.storageHauler && storage && storage.store[RESOURCE_ENERGY] > 5000) {
                creep.say("🛻🔋🏪");
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
                return;
            }

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
                creep.say("🚚🔋");
                return;
            }
            if (storage && storage.store[RESOURCE_ENERGY] > 1000) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
                creep.say("🚚 🔋→🔋");
                return;
            }

            creep.say("🚚⏳💤");
        } else {
            // Full → lämna energi

            // prioritera spawn + extensions först, sen tower, sen storage
            let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => {
                    return (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_TOWER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });

            if (target) {
                creep.say("🚚🔋📦");
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {reusePath: 10, visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Inget som behöver energi → gå till storage som backup eller stå still
                let storage = creep.room.storage;
                if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    creep.say("🚚🔋📦");
                    if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 10});
                    }
                } else {
                    creep.say("⏳ 📦📦📦 💤");
                }
            }
        }
    }
};

module.exports = roleHauler;