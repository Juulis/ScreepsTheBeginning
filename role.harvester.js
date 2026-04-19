var helper = require('helper');

var roleHarvester = {


    /** @param {Creep} creep
     @param {string} sourceId **/
    run: function (creep, sourceId) {
        if (creep.memory.harvesting && creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false;
        }
        if (!creep.memory.harvesting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.harvesting = true;
        }

        //handle statistics
        if (creep.memory.role === "harvester") {
            if (creep.ticksToLive === 3) {
                if (!Memory.stats) Memory.stats = {};
                if (!Memory.stats.energy) Memory.stats.energy = {};
                if (!Memory.stats.energy.harvesters) Memory.stats.energy.harvesters = [];
                Memory.stats.energy.harvesters.push({
                    cost: creep.memory.cost || 0,
                    harvested: creep.memory.harvested || 0
                })
            }
        }

        if (creep.memory.harvesting) {
            //HARVESTING
            if (Memory.debug) console.log(creep.name + " going to " + creep.memory.source)
            //if in another room for source, first go to exit
            creep.say("⛏️⚡")
            const srcMem = Memory.sources[sourceId];
            const pos = new RoomPosition(srcMem.x, srcMem.y, srcMem.roomName);

            // Vänta tills vi får vision
            const source = Game.getObjectById(sourceId);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    const container = _.find(source.pos.findInRange(FIND_STRUCTURES, 1),
                        s => s.structureType === STRUCTURE_CONTAINER
                    );
                    if (Memory.debug) console.log(creep.name + ": container exist?, moveTo. - " + container ? "true" : "false");
                    creep.moveTo(container ? container : pos, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 50});
                }
            } else {
                creep.moveTo(pos, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 50});
            }
        } else { // DELIVERING
            // Gå hem först om i annat rum
            const source = Game.getObjectById(sourceId);
            let constructionSite;
            let container;
            const isMainRoom = creep.room.name === Memory.mainRoom;
            if (source) {
                container = _.find(source.pos.findInRange(FIND_STRUCTURES, 2),
                    s => s.structureType === STRUCTURE_CONTAINER
                );
                constructionSite = creep.room.find(FIND_CONSTRUCTION_SITES)[0];
            }

            const brokenContainer = container && container.hits < container.hitsMax * 0.6;
            let containerGotRoomForEnergy = false;
            if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) containerGotRoomForEnergy = true;
            if (!constructionSite && !isMainRoom && !containerGotRoomForEnergy && !brokenContainer) {
                const mainRoomPos = new RoomPosition(25, 25, Memory.mainRoom); // mitt i rummet som mål, kvittar för den kommer inte in här när jag väl kommit in i rummet
                creep.moveTo(mainRoomPos, {visualizePathStyle: {stroke: '#00ff00'}, reusePath: 50});
                creep.say("⛏️|🔋📦→🏠")
                return;
            }


            if (Memory.debug) console.log(creep.name + "DELIVERING")
            let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            const totalHaulers = creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "hauler").length;
            let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (
                        s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION ||
                        s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_TOWER ||
                        s.structureType === STRUCTURE_STORAGE) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            const targetTowers = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0});
            const targetSpawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0});
            const targetExtension = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0});
            const targetContainer = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0});
            const targetStorage = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0});

            if (totalHaulers < 1) {
                target = targetSpawn || targetExtension || targetContainer || targetTowers || targetStorage;
            }

            if (hostile) {
                creep.say("WARMODE")
                target = targetTowers || targetSpawn || targetExtension || targetContainer || targetStorage;
            }

            if (!container && constructionSite && (helper.getEmpireEnergyAvailable() > 1000 || !isMainRoom)) {
                creep.say("⛏️| 🔨🧱");
                if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(constructionSite, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 50});
                }
                return;
            }

            if (Memory.debug) console.log("cgrfe:" + containerGotRoomForEnergy + " container:" + container);
            if (container && containerGotRoomForEnergy) {
                target = container;
            }

            const towersWithEnergyExist = creep.room.find(FIND_STRUCTURES, {filter: structure => structure.structureType === STRUCTURE_TOWER && structure.store.getUsedCapacity() > 100}).length > 0;
            if (container && !towersWithEnergyExist) {
                const repairUntil = 0.99;

                // Starta repair-läge om containern är dålig
                if (!creep.memory.repairing && brokenContainer) {
                    creep.memory.repairing = true;
                }

                // Om vi är i repair-läge → fortsätt reparera
                if (creep.memory.repairing) {
                    creep.say("⛏️|🔧️🧱");
                    const repaired = creep.repair(container);

                    if (repaired === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 30});
                    }

                    // Avsluta repair-läge när containern är ordentligt lagad
                    if (container.hits >= container.hitsMax * repairUntil) {
                        creep.memory.repairing = false;
                    }
                    return;
                }
            }

            creep.say("⛏️|🔋📦")
            const transferred = creep.transfer(target, RESOURCE_ENERGY);
            if (transferred === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 50});
            } else if (transferred === OK) {
                //spara harvested energy i memory (50 per CARRY bodypart)
                creep.memory.harvested = (creep.memory.harvested || 0) + (creep.body.filter(part => part.type === CARRY).length * 50);
            }
        }
    },

    manageSourceBalancing: function (room) {
        const harvesters = _.filter(Game.creeps, c => c.memory.role === "harvester");
        const sourceIds = Object.keys(Memory.sources); // alla source IDs
        const maxHarvestersPerSource = harvesters.length < sourceIds.length ? 1 : 2;
        const unbalanced = () => {
            const stage4RoomExist = _.some(Memory.rooms, (roomMem) => {
                return roomMem && roomMem.stage > 3;
            });
            return harvesters.length > 2 && !stage4RoomExist;
        };

        if (!unbalanced()) return;

        // 1. Grupp av harvesters per source
        const bySource = _.groupBy(harvesters, h => h.memory.source || "none");

        // 2. Räkna hur många harvesters varje källa har
        const counts = {};
        for (const id of sourceIds) {
            counts[id] = (bySource[id] || []).length;
        }

        // 3. Lista harvesters som saknar source eller är övertaliga
        const reassign = [];

        // harvesters utan source
        if (bySource.none) {
            reassign.push(...bySource.none);
        }

        // harvesters på överfulla sources
        for (const id of sourceIds) {
            const list = bySource[id] || [];
            if (list.length > maxHarvestersPerSource) {
                // behåll 2, resten ska reasignas
                reassign.push(...list.slice(maxHarvestersPerSource));
            }
        }

        // 4. Tilldela om harvesters så att varje källa får max 2
        for (const creep of reassign) {
            // hitta en källa med plats
            const target = sourceIds.find(id => counts[id] < maxHarvestersPerSource);
            if (!target) break; // alla fulla

            creep.memory.source = target;
            counts[target] += 1;
        }
    }

};
module.exports = roleHarvester;