var roleHarvester = require('role.harvester');
var roleBuilder = require('role.builder');
var roleUpgrader = require('role.upgrader');
var roleHauler = require('role.hauler');
var roleScout = require('role.scout');
var roleClaimer = require('role.claimer');
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
            else if (creep.memory.role === "hauler")
                roleHauler.run(creep);
            else if (creep.memory.role === "scout")
                roleScout.run(creep);
            else if (creep.memory.role === "claimer")
                roleClaimer.run(creep);
        }


    },

    handleSpawn: function (room) {
        const myRoomsTotal = Object.values(Game.rooms).filter(room => room.controller && room.controller.my).length;
        const roomsWithSources = Object.keys(Memory.rooms).filter(roomName =>
            Memory.rooms[roomName].sources && Object.keys(Memory.rooms[roomName].sources).length > 0
        );
        let max_harvesters = Object.keys(Memory.sources).length * 3;
        let max_builders = 1;
        let max_upgraders = 1;
        let max_haulers = 1;
        let max_claimers = roomsWithSources.length - myRoomsTotal;
        let harvesterLevel = 1;
        let builderLevel = 1;
        let upgraderLevel = 1;
        let haulerLevel = 1;


        const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");

        const harvestersTotal = roleCounts.harvester || 0;
        const buildersTotal = roleCounts.builder || 0;
        const upgradersTotal = roleCounts.upgrader || 0;
        const scoutsTotal = roleCounts.scout || 0;
        const haulerTotal = roleCounts.hauler || 0;
        const claimersTotal = roleCounts.claimer || 0;

        switch (room.memory.stage) {
            case 2:
                max_harvesters = Object.keys(Memory.sources).length * 3;
                max_builders = 2;
                max_upgraders = 1;
                max_haulers = 2;
                harvesterLevel = 2;
                builderLevel = 2;
                upgraderLevel = 2;
                haulerLevel = 2;
                break;
            case 3:
                max_harvesters = Object.keys(Memory.sources).length;
                max_builders = 4;
                max_upgraders = room.energyAvailable > 2000 ? 5 : 2;
                max_haulers = 3;
                harvesterLevel = 3;
                builderLevel = 3;
                upgraderLevel = 3;
                haulerLevel = 3;
                break;
        }

        const containersTotal = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_CONTAINER}).length;
        const storageExist = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_STORAGE}).length > 0;
        const constructionSitesExist = Object.keys(Game.constructionSites).length > 0;

        function spawnHarvester() {
            if (Memory.debug) console.log(`spawning harvester - harvlevel: ${harvesterLevel}`);

            if (harvesterLevel === 1) {
                console.log("creating harvester lvl1");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, CARRY, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: Object.keys(Memory.sources)[0],
                        cost: 200,
                        mainRoom: room.roomName,
                    }
                });
            } else if (harvesterLevel === 2) {
                console.log("creating harvester lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, CARRY, CARRY, MOVE, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: Object.keys(Memory.sources)[1],
                        cost: 400,
                        mainRoom: room.roomName,
                    }
                });
            } else if (harvesterLevel === 3) {
                console.log("creating harvester lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], 'Harvester(' + harvesterLevel + ')' + Game.time, {
                    memory: {
                        role: 'harvester',
                        source: Object.keys(Memory.sources)[1],
                        cost: 650,
                        mainRoom: room.roomName,
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
                        mainRoom: room.roomName,
                    }
                });
            } else if (upgraderLevel === 2) {
                console.log("creating upgrader lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, CARRY, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.roomName,
                    }
                });
            } else if (upgraderLevel === 3) {
                console.log("creating upgrader lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Upgrader(' + upgraderLevel + ')' + Game.time, {
                    memory: {
                        role: 'upgrader',
                        upgrading: false,
                        tempHarvester: true,
                        mainRoom: room.roomName,
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
                        mainRoom: room.roomName,
                    }
                });
            } else if (builderLevel === 2) {
                console.log("creating builder lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, MOVE, MOVE], 'Builder(' + builderLevel + ')' + Game.time, {
                    memory: {
                        role: 'builder',
                        building: false,
                        tempHarvester: true,
                        mainRoom: room.roomName,
                    }
                });
            } else if (builderLevel === 3) {
                console.log("creating builder lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE], 'Builder(' + builderLevel + ')' + Game.time, {
                    memory: {
                        role: 'builder',
                        building: false,
                        tempHarvester: true,
                        mainRoom: room.roomName,
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
                        mainRoom: room.roomName,
                    }
                });
            } else if (haulerLevel === 2) {
                console.log("creating hauler lvl2");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.roomName,
                    }
                });
            } else if (haulerLevel === 3) {
                console.log("creating hauler lvl3");
                room.find(FIND_MY_SPAWNS)[0].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], 'Hauler(' + haulerLevel + ')' + Game.time, {
                    memory: {
                        role: 'hauler',
                        mainRoom: room.roomName,
                    }
                });
            }

        }

        function spawnClaimer() {
            console.log("creating claimer");
            room.find(FIND_MY_SPAWNS)[0].spawnCreep([CLAIM, MOVE], 'Claimer' + Game.time, {
                memory: {
                    role: 'claimer',
                    mainRoom: room.roomName,
                }
            });
        }

        function spawnLevel4HarvesterClaimed(sourceId) {
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [WORK, WORK, WORK, WORK, CARRY, MOVE],
                'Harvester(4)-' + sourceId + '-' + Game.time,
                {
                    memory: {
                        role: 'harvester',
                        source: sourceId,
                        mainRoom: room.name,
                        cost: 500
                    }
                }
            );
        }

        function spawnLevel4Harvester(sourceId) {
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
                'Harvester(4)-' + sourceId + '-' + Game.time,
                {
                    memory: {
                        role: 'harvester',
                        source: sourceId,
                        mainRoom: room.name,
                        cost: 550
                    }
                }
            );
        }

        function spawnRemoteHauler(sourceId) {
            room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
                'Hauler(4)-' + sourceId + '-' + Game.time,
                {
                    memory: {
                        role: 'hauler',
                        source: sourceId,
                        mainRoom: room.name,
                    }
                }
            );
        }


        function spawnHarvesterStage3() {
            if (Memory.debug) console.log("in stage 3 balancing");

            const sources = Object.keys(Memory.sources);
            const creepsInRoom = room.find(FIND_MY_CREEPS);

            for (let sourceId of sources) {

                const sourceData = Memory.sources[sourceId];
                const sourceRoomName = sourceData.roomName;

                const isOwned = Game.rooms[sourceRoomName].controller.my;

                const maxPerSource = isOwned ? 1 : 3;

                const harvestersForSource = _.filter(creepsInRoom, c =>
                    c.memory.role === 'harvester' &&
                    c.memory.source === sourceId &&
                    c.ticksToLive > 200
                );
                const haulersForSource = _.filter(creepsInRoom, c =>
                    c.memory.role === 'hauler' &&
                    c.memory.source === sourceId &&
                    c.ticksToLive > 200
                );

                if (Memory.debug) console.log(`source ${sourceId} har ${harvestersForSource.length}/${maxPerSource}`);

                if (haulersForSource.length < 1) {
                    console.log("spawning Hauler lvl4 for source:", sourceId);
                    if (isOwned && harvestersForSource.length > 0) spawnRemoteHauler(sourceId);
                    break;
                }

                if (harvestersForSource.length < maxPerSource) {
                    const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");
                    const totalHaulers = roleCounts.hauler || 0;
                    console.log("spawning Harvester lvl4 for source:", sourceId);
                    if (isOwned && totalHaulers > 1) {
                        spawnLevel4HarvesterClaimed(sourceId);
                        break;
                    } else {
                        spawnLevel4Harvester(sourceId);
                        break;
                    }
                }
            }
        }

        // // convert to a hauler if no hauler and we got a container and 5+ harvesters
        // if (haulerTotal < 1 && room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_CONTAINER}).length > 0 && harvestersTotal > 5) {
        //     if (Memory.debug) console.log(`spawning hauler ${room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester")}`)
        //     room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester")[0].memory.role = "hauler";
        // }

        // convert to a scout if many harvesters and time to expand
        if (harvestersTotal > 2 && scoutsTotal === 0) {
            if (!Memory.visited || !(Memory.visited.length >= Memory.otherRooms.length)) {
                room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester")[0].memory.role = "scout";
            }
        }

        if (Memory.debug) console.log(`before spawning field, harvestersTotal:${harvestersTotal}, max_harvesters:${max_harvesters}`);
        //spawn creeps depending on available roles and capacity
        //first check if there is no upgraders but bunch of harvesters
        if ((upgradersTotal < 1) && room.memory.stage > 1 && ((upgradersTotal < 1 && harvestersTotal > 6))) {
            if (Memory.debug) console.log(`creating upgrader - balance`);
            spawnUpgrader();
        } else if (buildersTotal < max_builders && harvestersTotal > 5 && constructionSitesExist) {
            if (Memory.debug) console.log(`creating builder - balance`);
            spawnBuilder();
        } else if (haulerTotal < max_haulers && (containersTotal > 0 || storageExist)) {
            if (Memory.debug) console.log(`creating hauler`);
            spawnHauler();
        } else if (Game.gcl.level > 1 && claimersTotal < max_claimers) {
            if (Memory.debug) console.log(`creating claimer`);
            spawnClaimer();
        } else if (harvestersTotal < max_harvesters || room.memory.stage >= 3) {
            if (Memory.debug) console.log(`creating harvester`);
            if (room.memory.stage >= 3) spawnHarvesterStage3();
            else spawnHarvester();
        } else if (upgradersTotal < max_upgraders) {
            if (Memory.debug) console.log(`creating upgrader`);
            spawnUpgrader();
        } else if (buildersTotal < max_builders && constructionSitesExist) {
            if (Memory.debug) console.log(`creating builder`);
            spawnBuilder();
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
