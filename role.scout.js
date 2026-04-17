var roleScout = {
    run: function (creep) {
        // 0. Initiera Memory om det saknas
        if (!Memory.visited) Memory.visited = [];
        if (!Memory.sources) Memory.sources = {};

        // 1. Kontrollera om vi är färdiga: alla rum besökta OCH tillbaka hemma
        if (Memory.otherRooms.every(roomName => Memory.visited.includes(roomName))) {
            creep.say("🌍Scout klar → Harvester!");
            console.log(`${creep.name} bytte till harvester – alla rum scoutade`);
            creep.suicide();
            return;
        }

        // 2. Välj målrum om vi inte har något
        if (!creep.memory.targetRoom) {
            if (Memory.debug) console.log("choosing targetRoom");
            // Hitta första obesökta rummet
            for (const roomName of Memory.otherRooms) {
                if (!Memory.visited.includes(roomName)) {
                    creep.memory.targetRoom = roomName;
                    console.log(`${creep.name} väljer nytt mål: ${roomName}`);
                    break;
                }
            }

            // Om inga fler obesökta → sätt mål till hemmet
            if (!creep.memory.targetRoom) {
                creep.memory.targetRoom = Memory.mainRoom;
                creep.say("🌍 Alla scoutade – hem!");
            }
        }

        // 3. Gå till målrummet
        if (creep.room.name !== creep.memory.targetRoom) {
            const exitDir = Game.map.findExit(creep.room.name, creep.memory.targetRoom);
            if (Memory.debug) console.log("go to targetRoom ", exitDir);

            if (exitDir === ERR_NO_PATH || exitDir === ERR_INVALID_ARGS) {
                creep.say("🌍 No path!");
                console.log(`Ingen väg från ${creep.room.name} till ${creep.memory.targetRoom}`);
                // Ta bort målet för att undvika loop
                creep.memory.targetRoom = Memory.mainRoom;
                return;
            }

            const exit = creep.pos.findClosestByRange(exitDir);

            if (exit) {
                creep.moveTo(exit, {
                    reusePath: 50,
                    visualizePathStyle: {stroke: '#ff00ff'}
                });
                creep.say("🌍 → " + creep.memory.targetRoom);
            } else {
                creep.say("🌍 No exit?");
                creep.memory.targetRoom = Memory.mainRoom; // säkerhetsåtergång
            }
        }
        // 4. När vi är framme i målrummet
        else {
            // Spara nya sources
            const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES).length > 0;
            const hostileArea = (creep.room.controller && !creep.room.controller.my && creep.room.controller.owner) || hostileStructures;
            if (!hostileArea) {
                const sources = creep.room.find(FIND_SOURCES);
                let newSources = 0;

                sources.forEach(source => {
                    if (!Memory.sources[source.id]) {
                        Memory.sources[source.id] = {
                            roomName: source.room.name,
                            x: source.pos.x,
                            y: source.pos.y
                        };
                        // Spara även per rum
                        if (!Memory.rooms[creep.room.name]) Memory.rooms[creep.room.name] = {};
                        if (!Memory.rooms[creep.room.name].sources) Memory.rooms[creep.room.name].sources = [];
                        if (!Memory.rooms[creep.room.name].sources.includes(source.id)) {
                            Memory.rooms[creep.room.name].sources.push(source.id);
                        }
                        newSources++;
                    }
                });

                if (newSources > 0) {
                    creep.say(`🌍 +${newSources} src`);
                } else {
                    creep.say("🌍 No new");
                }
            } else {
                if(!Memory.hostileRooms) Memory.hostileRooms = [];
                Memory.hostileRooms.push(creep.room.name);
            }
            // Markera rummet som besökt (bara om det inte redan är)
            if (!Memory.visited.includes(creep.room.name)) {
                Memory.visited.push(creep.room.name);
            }

            // Är vi hemma? → nollställ targetRoom så vi kan välja nytt rum nästa tic
            if (creep.room.name === Memory.mainRoom) {
                creep.memory.targetRoom = null;
                creep.say("🌍 ✅🏠");

                // Här kan du också kolla om alla rum är scoutade och byta roll
            } else {
                // Vi är i ett annat rum vi just scoutat → åk hem
                creep.memory.targetRoom = Memory.mainRoom;
                creep.say("🌍 ➡️🏠");
            }
        }
    }
};

module.exports = roleScout;