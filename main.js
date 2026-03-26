var {buildManager} = require("build.handler")
var {handleRoles, handleSpawn} = require('creepHandler');
var {manageSourceBalancing} = require('role.harvester');
var {towerManager} = require('tower.handler');
var helper = require('helper');

module.exports.loop = function () {
    // Rensa död memory (bra vana)
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) delete Memory.creeps[name];
    }
    // Fixa creeps utan role eller tom memory
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        if (!creep.memory || Object.keys(creep.memory).length === 0 || !creep.memory.role) {
            console.log(`[AUTO-FIX] ${name} saknade role/memory → sätts till harvester`);
            creep.memory = {
                role: "harvester",
                autoFixed: Game.time  // för debug
            };
            creep.say("Role fix!");
        }
    }

    console.log(`cpu: ${Game.cpu.getUsed().toFixed(2)}/${Game.cpu.limit} | Bucket: ${Game.cpu.bucket}`);

    //setup sources and mainRoom in memory om inte finns
    if (!Memory.sources) {
        const sources = Game.spawns["Spawn1"].room.find(FIND_SOURCES);
        Memory.sources = sources.map(source => source.id);
    }
    if (!Memory.mainRoom) Memory.mainRoom = Game.spawns["Spawn1"].room.name;
    if (!Memory.otherRooms) {
        Memory.otherRooms = [];
        const exits = Game.map.describeExits(Memory.mainRoom);

        for (const dir in exits) {
            const adjacentRoom = exits[dir];
            if (!Memory.otherRooms.includes(adjacentRoom)) {
                Memory.otherRooms.push(adjacentRoom);
            }
        }
        console.log("Sparade angränsande rum:", Memory.otherRooms);
    }

    //Set what stage the room is in, deciding level of creeps, what buildings to build and total creeps for each role.

    const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");

    const harvestersTotal = roleCounts.harvester || 0;

    const setStage = (room) => {
        if (Memory.debug) console.log(`setting stage - energy:${room.energyAvailable} - sources: ${Memory.sources.length} - harvesters: ${harvestersTotal}`);
        let stage = 1;
        if (room.energyCapacityAvailable > 500)
            stage = 2;
        if (room.energyCapacityAvailable > 700 && Memory.sources && Memory.sources.length > 3 && harvestersTotal > 8)
            stage = 3;
        if (harvestersTotal < 3 && room.energyAvailable < 500)
            stage = 1
        return stage;
    };

    function progressBar(current, max, length = 20) {
        const percent = current / max;
        const filled = Math.round(percent * length);
        const empty = length - filled;

        const bar = '█'.repeat(filled) + '-'.repeat(empty);
        return `[${bar}] ${current}/${max} (${(percent * 100).toFixed(1)}%)`;
    }

    function handleLogs(room) {
        //gameStatus logging
        const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");

        const harvestersTotal = roleCounts.harvester || 0;
        const buildersTotal = roleCounts.builder || 0;
        const upgradersTotal = roleCounts.upgrader || 0;
        const scoutsTotal = roleCounts.scout || 0;
        const haulersTotal = roleCounts.hauler || 0;

        console.log(`energy: ${room.energyAvailable}(${helper.getEmpireEnergyAvailable()})/${room.energyCapacityAvailable}(${helper.getEmpireEnergyCapacity()})`)
        console.log(`stage ${room.memory.stage} - RCL:${room.controller.level} - ${progressBar(room.controller.progress,room.controller.progressTotal)}`);
        console.log(`harvesters:${harvestersTotal}, upgraders:${upgradersTotal}, builders:${buildersTotal}, scouts: ${scoutsTotal}, haulers: ${haulersTotal}`);

        // Logga till memory varje halvtimme (1800 ticks = 30 min)
        if (Game.time % 1200 === 0) {
            const roleCounts = _.countBy(Game.creeps, c => c.memory.role || "no_role");

            const logEntry = {
                timestamp: new Date().toISOString(), // för att se datum/tid
                totalCreeps: Object.keys(Game.creeps).length,
                harvesters: roleCounts.harvester || 0,
                upgraders: roleCounts.upgrader || 0,
                builders: roleCounts.builder || 0,
                haulers: roleCounts.hauler || 0,
                energy: helper.getEmpireEnergyAvailable(),
                energyCapacity: helper.getEmpireEnergyCapacity(),
            };

            // Spara i en array i Memory
            if (!Memory.creepLog) Memory.creepLog = [];
            Memory.creepLog.push(logEntry);

            console.log("Loggade creeps:", logEntry);
        }

        if (Memory.creepLog && Memory.creepLog.length > 1000) {
            Memory.creepLog = Memory.creepLog.slice(-500); // behåll sista 500
        }
    }

//loop through all rooms and do the loop
    for (const roomName in Game.rooms) {
        if (Memory.debug) console.log("in roomLoop:", roomName);
        const room = Game.rooms[roomName];

        room.memory.stage = setStage(room);

        //setup sources for the room
        if (!room.memory.sources) {
            room.memory.sources = [];
            const sources = room.find(FIND_SOURCES);
            sources.forEach(source => {
                room.memory.sources.push(source.id);
            });
        }

        //set screeps&towers to work/move
        handleRoles(room);
        towerManager(room);


        //handle stuff in mainRoom
        if (Memory.mainRoom === roomName) {
            // Display spawn message
            if (Game.spawns["Spawn1"].spawning) {
                const spawn = Game.spawns["Spawn1"];
                const name = spawn.spawning.name;
                const memory = Memory.creeps[name];
                room.visual.text("👶 Spawning " + memory.role, spawn.pos.x, spawn.pos.y - 1, {font: 0.5});
            }

            handleLogs(room);
            handleSpawn(room);
            manageSourceBalancing(room);
            buildManager(room);
            console.log("---------------------------------------------------------" + "tic:" + Game.time + "------------------------------------------------------------------")
        }
    }
}