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
                if (source) {
                    container = _.find(source.pos.findInRange(FIND_STRUCTURES, 1),
                        s => s.structureType === STRUCTURE_CONTAINER
                    );
                    constructionSite = _.find(source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1),
                        s => s.structureType === STRUCTURE_CONTAINER
                    );
                }
                if (!container && !constructionSite && creep.room.name !== Memory.mainRoom) {
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

                if (constructionSite && (helper.getEmpireEnergyAvailable() > 1000 || creep.room.name !== Memory.mainRoom)) {
                    creep.build(constructionSite)
                    creep.say("⛏️| 🔨🧱");
                    return;
                }
                if (container) {
                    target = container;
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
            //log the distributed sources
            const creepsByRole = _.groupBy(Game.creeps, c => c.memory.role || "no role");
            const harvesters = creepsByRole.harvester || [];
            const upgraders = creepsByRole.upgrader || []; //exempel för senare

            const counts = {};
            for (const name in Game.creeps) {
                const creep = Game.creeps[name];
                const src = creep.memory.source;
                const harvester = creep.memory.role === "harvester";
                if (src)
                    counts[src] = (counts[src] || 0) + 1;

            }

            let logDistr = "sourceBalancing: ";
            Object.keys(counts)
                .sort((a, b) => Number(a) - Number(b))
                .forEach(src => {
                    logDistr += `${src.slice(-5)}:${counts[src]} `;
                });
            console.log(logDistr);

            //TODO make theses numbers depend on how many sources in the room
            const source_1 = Object.keys(Memory.sources)[0];
            const source_2 = Object.keys(Memory.sources)[1];
            const source_3 = Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1];
            const source_4 = Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1];
            const source_5 = Object.keys(Memory.sources)[4] || Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1];
            const source_6 = Object.keys(Memory.sources)[5] || Object.keys(Memory.sources)[2]
            const source_7 = Object.keys(Memory.sources)[6] || Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1];
            const source_8 = Object.keys(Memory.sources)[7] || Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1];

            //check somehow if we are unbalanced?
            const unbalanced = () => {
                if (room.memory.stage >= 3) return false;
                return harvesters.length > 3;
                // return source0 === 0 || source1 === 0 && source2 === 3 && source3 === 3 && source4 === 3;
            };

            harvesters.sort((a, b) => a.name.localeCompare(b.name));

            if (!unbalanced())
                return;

            const groups = [
                {start: 0, end: 3, source: source_1},
                {start: 3, end: 6, source: source_2},
                {start: 6, end: 9, source: source_3},
                {start: 9, end: 12, source: source_4},
                {start: 12, end: 15, source: source_5},
                {start: 15, end: 18, source: source_6},
                {start: 18, end: 21, source: source_7},
                {start: 21, end: 30, source: source_8}
            ];

            groups.forEach(group => {
                for (let i = group.start; i < group.end && i < harvesters.length; i++) {
                    const creep = harvesters[i];
                    if (creep.memory.source !== group.source) {
                        if (Memory.debug) console.log(creep.name + " : " + creep.memory.source + " -> " + group.source);
                        creep.memory.source = group.source;
                        creep.say("→ " + group.source);
                    }
                }
            });
        }
    }
;
module.exports = roleHarvester;