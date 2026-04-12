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

        // === STEG 1: Bestäm om vi ska hämta eller lämna ===
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
            var sourceRoom = sourceData.roomName;
            var mainRoom = creep.memory.mainRoom;
            const roomObj = Game.rooms[sourceRoom];
            const isOwned = roomObj && roomObj.controller && roomObj.controller.my;
            const hasSpawn = roomObj && roomObj.find(FIND_MY_SPAWNS).length > 0;

            if (!creep.memory.delivering) {

                // gå till rätt rum först
                if (creep.room.name !== sourceRoom) {
                    creep.say("🚚➡️🌍");
                    creep.moveTo(new RoomPosition(25, 25, sourceRoom), {
                        visualizePathStyle: {stroke: '#000000'},
                        reusePath: 50
                    });
                    return;
                }

                // hitta container nära source
                const source = Game.getObjectById(sourceId);
                const container = source.pos.findInRange(FIND_STRUCTURES, 1)
                    .find(s => s.structureType === STRUCTURE_CONTAINER);

                if (container && !creep.memory.targetContainer) creep.memory.targetContainer = container.id;

                if (container && container.store[RESOURCE_ENERGY] > 200) {
                    creep.say("🚚🔋");
                    if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, {visualizePathStyle: {stroke: '#000000'}, reusePath: 50});
                    }
                    return;
                }

                // fallback: dropped energy
                const dropped = source.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0];
                if (dropped) {
                    creep.say("🚚🧹");
                    if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(dropped, {visualizePathStyle: {stroke: '#000000'}, reusePath: 50});
                    }
                    return;
                }

                creep.say("⛏️⏳");
            } else {
                // gå hem först
                const myRooms = Object.values(Game.rooms)
                    .filter(r => r.controller && r.controller.my);

                const targetRoom = _.min(myRooms, r =>
                    creep.pos.getRangeTo(new RoomPosition(25, 25, r.name))
                );

                const needsEnergy = targetRoom.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_CONTAINER ||
                            s.structureType === STRUCTURE_STORAGE ||
                            s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_TOWER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }).length > 0;

                if (creep.room.name !== targetRoom.name && needsEnergy) {
                    creep.say("🚚🌍➡️📦");

                    creep.moveTo(new RoomPosition(25, 25, targetRoom.name), {
                        visualizePathStyle: {stroke: '#000000'},
                        reusePath: 50
                    });

                    return;
                }
            }
        }

        // Hämta energi
        if (!creep.memory.delivering) {

            // 1. Dropped energy (snabbast)
            let dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50 && r.room.name === creep.room.name
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
                    creep.moveTo(dropped, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
                }
                return;
                // }
            }

            // 2. Container
            let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] >= 300 &&  // undvik tomma
                    s.room.name === creep.room.name &&
                    !_.some(Game.creeps, c =>
                        (c.memory.role === "hauler" || c.memory.role === "remoteHauler") &&
                        c.memory.targetContainer &&
                        c.memory.targetContainer === s.id &&
                        c.id !== creep.id && s.store[RESOURCE_ENERGY] < 1000
                    )
            });
            let storage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE &&
                    s.store[RESOURCE_ENERGY] >= 50 &&  // undvik tomma
                    s.room.name === creep.room.name
            });

            // STORAGE HAULER
            if (creep.memory.storageHauler && storage) {
                creep.say("🛻🔋🏪");
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
                }
                return;
            }

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
                }
                if (creep.memory.role === "hauler") creep.memory.targetContainer = container.id;
                creep.say("🚚🔋");
                return;
            }
            // if (storage && storage.store[RESOURCE_ENERGY] > 1000) {
            //     if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
            //     }
            //     creep.say("🚚 🔋→🔋");
            //     return;
            // }

            creep.say("🚚⏳💤");
        } else {
            // Full → lämna energi
            if (creep.memory.role === "hauler") creep.memory.targetContainer = "";
            if (Memory.debug) console.log(creep.name + "full, dumping");
            let target;
            let sourceInMainRoom = false;
            const hasSpawn = creep.room.find(FIND_MY_SPAWNS).length > 0;
            const source = Game.getObjectById(creep.memory.source);
            if (source && source.room.name === Memory.mainRoom) sourceInMainRoom = true;

            if (creep.memory.role === "remoteHauler" && !sourceInMainRoom && !hasSpawn) {
                //för remotehaulers, prioritera bara närmsta deliveryplace
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => {
                        return (s.structureType === STRUCTURE_SPAWN ||
                                s.structureType === STRUCTURE_EXTENSION ||
                                s.structureType === STRUCTURE_CONTAINER ||
                                s.structureType === STRUCTURE_TOWER) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            } else {
                // prioritera spawn + extensions först, sen tower, sen storage
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => {
                        return (s.structureType === STRUCTURE_SPAWN ||
                                s.structureType === STRUCTURE_EXTENSION ||
                                s.structureType === STRUCTURE_TOWER) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            }

            if (target) {
                creep.say("🚚🔋📦");
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {reusePath: 50, visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Inget som behöver energi → gå till storage som backup eller stå still
                let storage = creep.room.storage;
                if (!creep.memory.storageHauler && storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    creep.say("🚚🔋📦");
                    if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
                    }
                } else {
                    creep.say("⏳ 📦📦📦 💤");
                }
            }
        }
    }
};

module.exports = roleHauler;