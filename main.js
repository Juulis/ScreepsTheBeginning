var {buildManager} = require("build.handler")
var {handleRoles, handleSpawn} = require('creepHandler');
var {manageSourceBalancing} = require('role.harvester');
var {towerManager} = require('tower.handler');
var helper = require('helper');

module.exports.loop = function () {
    console.log("\n\n\n\n" + "---------------------------------------------------------" + Memory.serverName + " tic:" + Game.time + "------------------------------------------------------------------")
    if (!Memory.username) Memory.username = "Juulis";
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

    function setExits(room) {
        const exits = Game.map.describeExits(room);
        if (Memory.debug) console.log(`--- controlled room ${room.name} exits ${exits}---`)

        for (const dir in exits) {
            if (Memory.debug) console.log(`--- controlled room ${room.name} exit ${dir}---`)
            const adjacentRoom = exits[dir];
            if (!Memory.otherRooms.includes(adjacentRoom) && Memory.mainRoom !== adjacentRoom) {
                Memory.otherRooms.push(adjacentRoom);
            }
        }
        console.log("Sparade angränsande rum:", Memory.otherRooms);
    }

    // setup sources and mainRoom in memory om inte finns
    if (!Memory.sources) {
        Memory.sources = {};

        const sources = Game.spawns["Spawn1"].room.find(FIND_SOURCES);

        for (const source of sources) {
            Memory.sources[source.id] = {
                x: source.pos.x,
                y: source.pos.y,
                roomName: source.pos.roomName
            };
        }
    }
    if (!Memory.mainRoom) Memory.mainRoom = Game.spawns["Spawn1"].room.name;
    if (!Memory.otherRooms) {
        Memory.otherRooms = [];
        setExits(Memory.mainRoom);
    }

    //Set what stage the room is in, deciding level of creeps, what buildings to build and total creeps for each role.

    const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");

    const harvestersTotal = roleCounts.harvester || 0;

    const setStage = (room) => {
        if (Memory.debug) console.log(`setting stage - energy:${room.energyAvailable} / ${room.energyCapacityAvailable} - sources: ${Object.keys(Memory.sources).length} - harvesters: ${harvestersTotal}`);
        let stage = 1;
        const harvestersInRoom = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "harvester").length;
        const haulersInRoom = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "hauler").length;
        const remoteHaulersInRoom = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "remoteHauler").length;
        const roomSources = room.memory.sources.length;

        const stage2 = room.energyCapacityAvailable > 500 && harvestersInRoom >= roomSources;
        const stage3 = stage2 && room.energyCapacityAvailable > 700 && Memory.visited && Memory.visited.length > 2 && haulersInRoom + remoteHaulersInRoom >= 2;
        const stage4 = stage2 && stage3 && room.controller && room.controller.level >= 5;

        if (stage2) stage = 2;
        if (stage3) stage = 3;
        if (stage4) stage = 4;

        return stage;
    };

    function progressBar(current, max, length = 20) {
        if (max <= 0) max = 1;

        const percent = current / max;

        // clamp filled
        const filled = Math.max(0, Math.min(length, Math.round(percent * length)));
        const empty = Math.max(0, length - filled);

        let bar;

        if (current <= 0) {
            bar = "OBS!! Controller degrading!!";
        } else {
            bar = '█'.repeat(filled) + '-'.repeat(empty);
        }

        return `[${bar}] ${current}/${max} (${(percent * 100).toFixed(1)}%)`;
    }

    function globalProgressBar(current, max, length = 20) {
        const percent = current / max;
        const filled = Math.round(percent * length);
        const empty = length - filled;

        const bar = '█'.repeat(filled) + '-'.repeat(empty);
        return `[${bar}] ${current}/${max} (${(percent * 100).toFixed(1)}%)`;
    }

    function handleGameLogs(room) {
        const roleCounts = _.countBy(Game.creeps, creep => creep.memory.role || "no role");

        const harvestersTotal = roleCounts.harvester || 0;
        const buildersTotal = roleCounts.builder || 0;
        const upgradersTotal = roleCounts.upgrader || 0;
        const scoutsTotal = roleCounts.scout || 0;
        const haulersTotal = roleCounts.hauler || 0;
        const remoteHaulersTotal = roleCounts.remoteHauler || 0;
        const claimersTotal = roleCounts.claimer || 0;
        const warriorsTotal = roleCounts.warrior || 0;

        console.log(`GCL:${Game.gcl.level} - ${progressBar(Game.gcl.progress, Game.gcl.progressTotal)}`);
        console.log(`harvesters:${harvestersTotal}, upgraders:${upgradersTotal}, builders:${buildersTotal}, scouts: ${scoutsTotal}, haulers: ${haulersTotal}+${remoteHaulersTotal}, claimers: ${claimersTotal}, warriors: ${warriorsTotal}`);

        //log the distributed sources
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


        // Logga till memory varje timme
        if (Game.time % 1200 === 0) {
            const roleCounts = _.countBy(Game.creeps, c => c.memory.role || "no_role");

            const logEntry = {
                timestamp: new Date().toISOString(), // för att se datum/tid
                totalCreeps: Object.keys(Game.creeps).length,
                harvesters: roleCounts.harvester || 0,
                upgraders: roleCounts.upgrader || 0,
                builders: roleCounts.builder || 0,
                haulers: roleCounts.hauler || 0,
                remoteHaulers: roleCounts.remoteHauler || 0,
                claimers: roleCounts.claimer || 0,
                warriors: roleCounts.warrior || 0,
                energy: helper.getEmpireEnergyAvailable(),
                sourceDistr: logDistr,
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

    function handleRoomLogs(room) {

        console.log(`energy: ${room.energyAvailable}(${helper.getEmpireEnergyAvailable()})/${room.energyCapacityAvailable}(${helper.getEmpireEnergyCapacity()})`)
        console.log(`stage ${room.memory.stage} - RCL:${room.controller.level} - ${progressBar(room.controller.progress, room.controller.progressTotal)}`);

    }

    handleGameLogs();

    Memory.hostilesNearby = [];
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        Memory.hostilesNearby = hostileStructures.concat(hostileCreeps);
    }

    //loop through all rooms and do the loop
    for (const roomName in Game.rooms) {
        if (Memory.debug) console.log("in roomLoop:", roomName);
        const room = Game.rooms[roomName];
        console.log("---------------------------------------------------------" + room.name + "------------------------------------------------------------------")

        room.memory.stage = setStage(room);

        //setup sources for the room
        if (!room.memory.sources) {
            room.memory.sources = [];
            const sources = room.find(FIND_SOURCES);
            sources.forEach(source => {
                room.memory.sources.push(source.id);
            });
        }

        //ALL ROOMS
        handleRoles(room);
        towerManager(room);
        buildManager(room);

        //ONLY CONTROLLED ROOMS
        if (room.controller && room.controller.my) {
            if (Memory.debug) console.log("--- controlled rooms ---")
            if (Memory.mainRoom !== room.name && !room.memory.exitsHandled) {
                setExits(room.name);
                room.memory.exitsHandled = true;
            }
            // Display spawn message
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            if (spawn && spawn.spawning) {
                const name = spawn.spawning.name;
                const memory = Memory.creeps[name];
                room.visual.text("👶 Spawning " + memory.role, spawn.pos.x, spawn.pos.y - 1, {font: 0.5});

            }
            if (spawn) handleSpawn(room);
            manageSourceBalancing(room);
            handleRoomLogs(room);

        }

        //ONLY MAINROOM
        if (Memory.mainRoom === roomName) {

        }
    }
}