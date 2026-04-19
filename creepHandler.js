var roleHarvester = require('role.harvester');
var roleBuilder = require('role.builder');
var roleUpgrader = require('role.upgrader');
var roleHauler = require('role.hauler');
var roleScout = require('role.scout');
var roleClaimer = require('role.claimer');
var roleWarrior = require('role.warrior');
var helper = require('helper');

var creepHandler = {

    handleRoles: function (room) {
        for (var name in room.find(FIND_MY_CREEPS)) {
            var creep = room.find(FIND_MY_CREEPS)[name];

            let lowEnergyMode = false;
            if (room.name === Memory.mainRoom) {
                //announce lowEnergyMode warning
                lowEnergyMode = room.energyAvailable < 200 && _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "harvester").length < 3;
                if (lowEnergyMode) console.log("Warning! lowEnergyMode");
            }

            if (lowEnergyMode && creep.memory.tempHarvester) {
                roleHarvester.run(creep, Object.keys(Memory.sources)[1]);
            } else if (creep.memory.role === "harvester")
                roleHarvester.run(creep, creep.memory.source || Object.keys(Memory.sources)[0]);
            else if (creep.memory.role === "builder")
                roleBuilder.run(creep);
            else if (creep.memory.role === "upgrader")
                roleUpgrader.run(creep);
            else if (creep.memory.role === "hauler" || creep.memory.role === "remoteHauler")
                roleHauler.run(creep);
            else if (creep.memory.role === "scout")
                roleScout.run(creep);
            else if (creep.memory.role === "claimer")
                roleClaimer.run(creep);
            else if (creep.memory.role === "warrior")
                roleWarrior.run(creep);
        }


    },

    handleSpawn: function (room) {
        const myRoomsTotal = Object.values(Game.rooms).filter(room => room.controller && room.controller.my).length;
        const roomsWithSources = new Set(Object.values(Memory.sources).map(s => s.roomName)).size;
        const isMainRoom = room.name === Memory.mainRoom;
        let max_harvesters = Object.keys(Memory.sources).length * 2;
        let max_builders = 1;
        let max_upgraders = 1;
        let max_haulers = 1;
        let max_claimers = roomsWithSources - myRoomsTotal;
        let harvesterLevel = 1;
        let builderLevel = 1;
        let upgraderLevel = 1;
        let haulerLevel = 1;
        let claimerLevel = room.energyCapacityAvailable < 1400 ? 1 : 1;
        let warriorLevel = 1;

        const roomRoleCounts = _.countBy(_.filter(Game.creeps, c => c.memory.mainRoom === room.name), creep => creep.memory.role || "no role");
        const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");
        const upgradersInCurrentRoom = room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "upgrader");
        const harvestersInCurrentRoom = room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester");
        const stage4RoomExist = _.some(Memory.rooms, (roomMem) => {return roomMem && roomMem.stage > 3;});
        const sourcesInRoom = room.find(FIND_SOURCES);

        const harvestersTotal = roleCounts.harvester || 0;
        const buildersTotal = roleCounts.builder || 0;
        const upgradersTotal = roleCounts.upgrader || 0;
        const scoutsTotal = roleCounts.scout || 0;
        const haulersTotal = roleCounts.hauler || 0;
        const remoteHaulersTotal = roleCounts.remoteHauler || 0;
        const claimersTotal = roleCounts.claimer || 0;
        const warriorsTotal = roleCounts.warrior || 0;
        const containersInRoom = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_CONTAINER}).length;
        const storageExist = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_STORAGE}).length > 0;
        const constructionSitesExist = room.find(FIND_CONSTRUCTION_SITES).length > 0;
        const harvestersInRoom = roomRoleCounts.harvester || 0;
        const haulersInRoom = roomRoleCounts.hauler || 0;
        const buildersInRoom = roomRoleCounts.builder || 0;
        const upgradersInRoom = roomRoleCounts.upgrader || 0;

        if (room.memory.stage === 2) {
            if (Memory.debug) console.log("in stage 2 creepbalancing");
            max_harvesters = Object.keys(Memory.sources).length;
            max_builders = 2;
            max_upgraders = 1;
            max_haulers = 2;
            harvesterLevel = 2;
            builderLevel = 2;
            upgraderLevel = 2;
            haulerLevel = 2;
        } else if (room.memory.stage === 3) {
            if (Memory.debug) console.log("in stage 3 creepbalancing");
            max_harvesters = Object.keys(Memory.sources).length;
            max_builders = 4;
            max_upgraders = helper.getEmpireEnergyAvailable() > 5000 ? 5 : 3;
            max_haulers = 2;
            harvesterLevel = 3;
            builderLevel = 3;
            upgraderLevel = 3;
            haulerLevel = 3;
        } else if (room.memory.stage >= 4) {
            if (Memory.debug) console.log("in stage 4+ creepbalancing");
            max_harvesters = 0; // handle this with sourcebalancing directly instead
            max_builders = 4;
            max_upgraders = helper.getEmpireEnergyAvailable() > 100000 ? 5 : 3;
            max_haulers = 2;
            harvesterLevel = 3; // level 4 has its own logic for now
            builderLevel = 3;
            upgraderLevel = helper.getEmpireEnergyAvailable() > 100000 ? 4 : 3;
            haulerLevel = 4;
            warriorLevel = 2;
        }


        function spawnHarvester() {
            if (Memory.debug) console.log(`spawning harvester - harvlevel: ${harvesterLevel}`);

            if (harvesterLevel === 1) {
                console.log("creating harvester lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, CARRY, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: room.memory.sources[0],
                        cost: 200,
                        mainRoom: room.name,
                    }
                });
            } else if (harvesterLevel === 2) {
                console.log("creating harvester lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: room.memory.sources[0],
                        cost: 400,
                        mainRoom: room.name,
                    }
                });
            } else if (harvesterLevel === 3) {
                console.log("creating harvester lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: room.memory.sources[0],
                        cost: 650,
                        mainRoom: room.name,
                    }
                });
            }
        }

        function spawnUpgrader() {
            if (upgraderLevel === 1) {
                console.log("creating upgrader lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, CARRY, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            } else if (upgraderLevel === 2) {
                console.log("creating upgrader lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, CARRY, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            } else if (upgraderLevel === 3) {
                console.log("creating upgrader lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            } else if (upgraderLevel === 4) {
                console.log("creating upgrader lvl4");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            }
        }

        function spawnBuilder() {
            if (builderLevel === 1) {
                console.log("creating builder lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, CARRY, MOVE], 'Builder(' + builderLevel + ')' + Game.time, {
                    memory: {
                        role: 'builder',
                        building: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            } else if (builderLevel === 2) {
                console.log("creating builder lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, MOVE, MOVE], 'Builder(' + builderLevel + ')' + Game.time, {
                    memory: {
                        role: 'builder',
                        building: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            } else if (builderLevel === 3) {
                console.log("creating builder lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Builder(' + builderLevel + ')' + Game.time, {
                    memory: {
                        role: 'builder',
                        building: false,
                        tempHarvester: true,
                        mainRoom: room.name,
                    }
                });
            }
        }

        function spawnHauler() {
            if (haulerLevel === 1) {
                console.log("creating hauler lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.name,
                    }
                });
            } else if (haulerLevel === 2) {
                console.log("creating hauler lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.name,
                    }
                });
            } else if (haulerLevel === 3) {
                console.log("creating hauler lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.name,
                    }
                });
            } else if (haulerLevel === 4) {
                console.log("creating hauler lvl4");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.name,
                    }
                });
            }

        }

        function spawnClaimer() {
            if (claimerLevel === 1) {
                console.log("creating claimer lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CLAIM, MOVE, MOVE], 'Claimer(1)' + Game.time, {
                    memory: {
                        role: 'claimer',
                        mainRoom: room.name,
                    }
                });
            }
            if (claimerLevel === 2) {
                console.log("creating claimer lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE], 'Claimer(2)' + Game.time, {
                    memory: {
                        role: 'claimer',
                        mainRoom: room.name,
                    }
                });
            }
        }

        function spawnLevel4Harvester(sourceId) {
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
                'Harvester(4)-' + sourceId + '-' + Game.time,
                {
                    memory: {
                        role: 'harvester',
                        source: sourceId,
                        mainRoom: room.name,
                        cost: 700
                    }
                }
            );
        }

        function spawnRemoteHauler(sourceId) {
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
                'Hauler(4)-' + sourceId + '-' + Game.time,
                {
                    memory: {
                        role: 'remoteHauler',
                        source: sourceId,
                        mainRoom: room.name,
                    }
                }
            );
        }

        function spawnScout() {
            console.log("creating scout");
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [MOVE],
                'Scout-' + Game.time,
                {
                    memory: {
                        role: 'scout',
                        mainRoom: room.name,
                    }
                }
            );
        }

        function spawnWarrior() {
            if (warriorLevel === 1) {
                console.log("creating warrior lvl 1 HUAHH");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                    [TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK, MOVE, MOVE],
                    'Warrior(1)' + Game.time,
                    {
                        memory: {
                            role: 'warrior',
                            mainRoom: room.name,
                        }
                    }
                );
            } else if (warriorLevel === 2) {
                console.log("creating warrior lvl 2 HUAHH");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                    [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
                    'Warrior(2)' + Game.time,
                    {
                        memory: {
                            role: 'warrior',
                            mainRoom: room.name,
                        }
                    }
                );
            }
        }


        function spawnHarvesterStage4() {
            if (Memory.debug) console.log("in stage 4 balancing");

            const sources = Object.keys(Memory.sources);
            const creepsGlobal = Object.values(Game.creeps);

            for (let sourceId of sources) {

                const harvestersForSource = _.filter(creepsGlobal, c =>
                    c.memory.role === 'harvester' &&
                    c.memory.source === sourceId &&
                    c.name.includes('Harvester(4)') &&
                    c.ticksToLive > 100
                );

                const haulersForSource = _.filter(creepsGlobal, c =>
                    c.memory.role === 'remoteHauler' &&
                    c.memory.source === sourceId &&
                    c.ticksToLive > 100
                );

                const sourceObj = Game.getObjectById(sourceId);
                let hasContainer = false;
                if (sourceObj) {
                    hasContainer = _.some(sourceObj.pos.findInRange(FIND_STRUCTURES, 1),
                        s => s.structureType === STRUCTURE_CONTAINER
                    );
                }

                // 1. Harvester först (max 1)
                if (harvestersForSource.length < 1) {
                    console.log("Spawning Harvester lvl4 for source:", sourceId);
                    spawnLevel4Harvester(sourceId);
                    return;
                }

                // 2. Hauler bara om harvester redan finns (max 1)
                if (hasContainer && harvestersForSource.length >= 1 && haulersForSource.length < 2) {
                    console.log("Spawning RemoteHauler lvl4 for source:", sourceId);
                    spawnRemoteHauler(sourceId);
                    return;
                }
            }
        }

        if (Memory.debug) console.log(`before spawning field, harvestersTotal:${harvestersTotal}, max_harvesters:${max_harvesters}`);

        //spawn creeps depending on available roles and capacity
        if ((harvestersTotal < max_harvesters / 2 && !stage4RoomExist) || harvestersInCurrentRoom.length < sourcesInRoom.length) {
            if (Memory.debug) console.log(`creating harvester`);
            spawnHarvester();
        } else if (haulersInRoom < max_haulers && (containersInRoom > 0 || storageExist)) {
            if (Memory.debug) console.log(`creating hauler`);
            spawnHauler();
        } else if (upgradersInCurrentRoom.length === 0) {
            if (Memory.debug) console.log(`creating upgrader`);
            spawnUpgrader();
        } else if (buildersInRoom < max_builders && constructionSitesExist) {
            if (Memory.debug) console.log(`creating builder`);
            spawnBuilder();
        } else if (Memory.hostilesNearby.length > 0 && warriorsTotal < 3) {
            if (Memory.debug) console.log(`creating warrior`);
            spawnWarrior();
        } else if ((isMainRoom || harvestersInRoom < room.memory.sources.length) && harvestersTotal < max_harvesters && !stage4RoomExist) {
            if (Memory.debug) console.log(`creating harvester`);
            spawnHarvester();
        } else if (Game.gcl.level > 1 && claimersTotal < max_claimers && room.energyCapacityAvailable > 700) {
            if (Memory.debug) console.log(`creating claimer`);
            spawnClaimer();
        } else if (upgradersInRoom < max_upgraders) {
            if (Memory.debug) console.log(`creating upgrader`);
            spawnUpgrader();
        } else if (room.controller && room.controller.my && scoutsTotal === 0) {
            if (!Memory.visited || Memory.otherRooms.some(x => !Memory.visited.includes(x))) {
                if (Memory.debug) console.log(`creating scout`);
                spawnScout();
            }
        }

        if (room.memory.stage >= 4) {
            spawnHarvesterStage4();
        }

        //DESPAWN
        if (!constructionSitesExist) {
            const spawn = Game.spawns["Spawn1"];
            for (let creep of room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "builder")) {
                creep.say("DEATHROW")
                if (creep.pos.isNearTo(spawn)) {
                    spawn.recycleCreep(creep);        // Ger tillbaka ~50-70% av energin som användes för att skapa creepen
                } else {
                    creep.moveTo(spawn, {visualizePathStyle: {stroke: '#ff0000'}});
                }
            }
        }

    }


}


module.exports = creepHandler;
