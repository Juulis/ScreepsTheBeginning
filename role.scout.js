var roleScout = {
    run: function (creep) {
        // 0. Initiera Memory om det saknas
        if (!Memory.visited) Memory.visited = [];
        if (!Memory.sources) Memory.sources = [];

        // 1. Kontrollera om vi är färdiga: alla rum besökta OCH tillbaka hemma
        if (creep.room.name === Memory.mainRoom &&
            Memory.visited.length >= Memory.otherRooms.length) {
            creep.memory.role = "harvester";
            creep.say("Scout klar → Harvester!");
            console.log(`${creep.name} bytte till harvester – alla rum scoutade`);
            return;
        }

        // 2. Välj målrum om vi inte har något
        if (!creep.memory.targetRoom) {
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
                creep.say("Alla scoutade – hem!");
            }
        }

        // 3. Gå till målrummet
        if (creep.room.name !== creep.memory.targetRoom) {
            const exitDir = Game.map.findExit(creep.room.name, creep.memory.targetRoom);

            if (exitDir === ERR_NO_PATH || exitDir === ERR_INVALID_ARGS) {
                creep.say("No path!");
                console.log(`Ingen väg från ${creep.room.name} till ${creep.memory.targetRoom}`);
                // Ta bort målet för att undvika loop
                creep.memory.targetRoom = Memory.mainRoom;
                return;
            }

            const exit = creep.pos.findClosestByRange(exitDir);

            if (exit) {
                creep.moveTo(exit, {
                    reusePath: 50,
                    visualizePathStyle: { stroke: '#ff00ff' }
                });
                creep.say("→ " + creep.memory.targetRoom);
            } else {
                creep.say("No exit?");
                creep.memory.targetRoom = Memory.mainRoom; // säkerhetsåtergång
            }
        }
        // 4. När vi är framme i målrummet
        else {
            // Spara nya sources
            const sources = creep.room.find(FIND_SOURCES);
            let newSources = 0;

            sources.forEach(source => {
                if (!Memory.sources.includes(source.id)) {
                    Memory.sources.push(source.id);
                    // Spara även per rum om du vill
                    if (!Memory.rooms[creep.room.name]) Memory.rooms[creep.room.name] = {};
                    if (!Memory.rooms[creep.room.name].sources) Memory.rooms[creep.room.name].sources = [];
                    if (!Memory.rooms[creep.room.name].sources.includes(source.id)) {
                        Memory.rooms[creep.room.name].sources.push(source.id);
                    }
                    newSources++;
                }
            });

            if (newSources > 0) {
                creep.say(`+${newSources} src`);
            } else {
                creep.say("No new");
            }

            // Markera rummet som besökt (bara om det inte redan är)
            if (!Memory.visited.includes(creep.room.name)) {
                Memory.visited.push(creep.room.name);
            }

            // Återvänd hem
            creep.memory.targetRoom = Memory.mainRoom;
            creep.say("Home!");
        }
    }
};

module.exports = roleScout;