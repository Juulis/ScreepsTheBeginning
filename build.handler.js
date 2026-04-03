var helper = require('helper');

var builder = {


    // BUILD-LOOP IS IN THE BOTTOM

    buildManager: function (room) {
        const totalExtensions = room.find(FIND_STRUCTURES, {filter: structure => structure.structureType === STRUCTURE_EXTENSION}).length;
        const totalExtensionConstructionsites = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_EXTENSION}).length;

        const buildExtensions = (room, spawnPos) => {
            if (!totalExtensions && room.controller.level > 1) {
                console.log("building first extensions at ", spawnPos);
                const posX = [spawnPos.x - 2, spawnPos.x + 2, spawnPos.x, spawnPos.x, spawnPos.x + 2];
                const posY = [spawnPos.y, spawnPos.y, spawnPos.y - 2, spawnPos.y + 2, spawnPos.y + 2];
                for (let i = 0; i < 5; i++) {
                    if (!(room.createConstructionSite(posX[i], posY[i], STRUCTURE_EXTENSION) === 0)) {
                        console.log("oops, couldnt build here, idiot...");
                    }
                }
            }
            if(Memory.debug)console.log(`cap: ${room.energyCapacityAvailable} crl: ${room.controller.level} ext: ${totalExtensions} extSites: ${totalExtensionConstructionsites}`);
            if (room.energyCapacityAvailable > 500 && room.controller.level > 2 && totalExtensions < 6 && totalExtensionConstructionsites < 1) {
                console.log("building second extensions at ", spawnPos);
                const posX = [spawnPos.x - 3, spawnPos.x + 3, spawnPos.x, spawnPos.x, spawnPos.x + 2];
                const posY = [spawnPos.y, spawnPos.y, spawnPos.y - 3, spawnPos.y + 3, spawnPos.y + 3];
                for (let i = 0; i < 5; i++) {
                    if (!(room.createConstructionSite(posX[i], posY[i], STRUCTURE_EXTENSION) === 0)) {
                        console.log("oops, couldnt build here, idiot...");
                    }
                }
            }
            if (room.controller.level > 3 && totalExtensions < 15 && totalExtensionConstructionsites < 1) {
                console.log("building second extensions at ", spawnPos);
                const posX = [spawnPos.x - 2, spawnPos.x + 4, spawnPos.x, spawnPos.x, spawnPos.x + 2];
                const posY = [spawnPos.y - 2, spawnPos.y, spawnPos.y - 4, spawnPos.y + 4, spawnPos.y + 4];
                for (let i = 0; i < 5; i++) {
                    if (!(room.createConstructionSite(posX[i], posY[i], STRUCTURE_EXTENSION) === 0)) {
                        console.log("oops, couldnt build here, idiot... " + posX[i] + ":" + posY[i]);
                    }
                }
            }
        }

        const buildContainer = (room) => {
            if (!room.controller || room.controller.level < 2) return;

            const existing = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            }).length;

            const sites = room.find(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            }).length;
            if (sites > 0) return;
            if (existing + sites >= 5) return;

            const exits = Game.map.describeExits(room.name);

            const sides = [
                {dir: TOP, dx: 0, dy: 2},
                {dir: BOTTOM, dx: 0, dy: -2},
                {dir: LEFT, dx: 2, dy: 0},
                {dir: RIGHT, dx: -2, dy: 0}
            ];

            for (const side of sides) {
                const targetRoom = exits[side.dir];
                const exitTiles = room.find(side.dir);
                if (exitTiles.length === 0) continue;
                //exkludera exits om de inte finns med i sourcelistan

                const targetRoomMem = Memory.rooms[targetRoom];
                if (!targetRoomMem || (targetRoom && !targetRoomMem.sources)) continue;

                if (!targetRoomMem.sources.length ||
                    !Memory.sources[targetRoomMem.sources[0]]) {
                    continue;
                }

                // Beräkna mitten en gång per sida
                let middleExit;
                if (side.dir === FIND_EXIT_TOP || side.dir === FIND_EXIT_BOTTOM) {
                    const sorted = [...exitTiles].sort((a, b) => a.x - b.x);
                    middleExit = sorted[Math.floor(sorted.length / 2)];
                } else {
                    const sorted = [...exitTiles].sort((a, b) => a.y - b.y);
                    middleExit = sorted[Math.floor(sorted.length / 2)];
                }

                const buildPos = new RoomPosition(
                    middleExit.x + side.dx,
                    middleExit.y + side.dy,
                    room.name
                );

                // Kolla om platsen är ledig
                const occupiedByContainer = buildPos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_CONTAINER) ||
                    buildPos.lookFor(LOOK_CONSTRUCTION_SITES).some(s => s.structureType === STRUCTURE_CONTAINER);
                // if (occupiedByContainer) buildPos.x > 40 || buildPos.x < -40 ? buildPos.x += 1 : buildPos.y += 1;
                if (occupiedByContainer) continue;

                const result = room.createConstructionSite(buildPos, STRUCTURE_CONTAINER);

                if (result === OK) {
                    console.log(`✅ Bygger container i mitten av ${side.dir} vid ${buildPos}`);
                    return;   // en container per tick
                } else {
                    console.log("wtf, you cant build container here " + buildPos)
                }
            }
        }


        const buildTower = (room, buildPos) => {
            const totalTowers = room.find(FIND_STRUCTURES, {filter: structure => structure.structureType === STRUCTURE_TOWER}).length;
            const controllerLvl = room.controller.level;
            const hasTowerConstructionSite = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_TOWER}).length > 0;

            if (!hasTowerConstructionSite && totalTowers < 1 && controllerLvl > 2) {
                console.log("building tower 1");
                if (!(room.createConstructionSite(buildPos.x, buildPos.y + 1, STRUCTURE_TOWER) === 0)) {
                    console.log("oops, couldnt build here, idiot..." + buildPos.x + ":" + buildPos.y - 1);
                }
            } else if (controllerLvl > 4 && !hasTowerConstructionSite && totalTowers < 2) {
                console.log("building 2nd tower");
                if (!(room.createConstructionSite(buildPos.x, buildPos.y - 1, STRUCTURE_TOWER) === 0)) {
                    console.log("oops, couldnt build here, idiot... " + buildPos.x + ":" + buildPos.y + 1);
                }
            }

        }


        const buildStorage = (room, buildPos) => {
            const totalStorages = room.find(FIND_STRUCTURES, {filter: structure => structure.structureType === STRUCTURE_STORAGE}).length;
            const controllerLvl = room.controller.level;
            const hasStorageConstructionSite = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_STORAGE}).length > 0;

            if (room.memory.stage > 2 && !hasStorageConstructionSite && totalStorages < 1 && helper.getEmpireEnergyCapacity() > 800 && controllerLvl > 3) {
                console.log("building first storage");
                if (!(room.createConstructionSite(buildPos.x + 3, buildPos.y - 1, STRUCTURE_STORAGE) === 0)) {
                    console.log("oops, couldnt build here, idiot...");
                }
            }
        }


        //preCheck if we should build stuff

        const buildersExist = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "builder").length > 0;

        // build the stuff
        const spawnPos = room.find(FIND_MY_SPAWNS)[0].pos;
        buildExtensions(room, spawnPos);
        buildContainer(room);
        buildStorage(room, spawnPos);
        buildTower(room, spawnPos);
    }
}

module.exports = builder;