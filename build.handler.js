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
            if (Memory.debug) console.log(`cap: ${room.energyCapacityAvailable} crl: ${room.controller.level} ext: ${totalExtensions} extSites: ${totalExtensionConstructionsites}`);
            if (room.energyCapacityAvailable > 500 && room.controller.level > 2 && totalExtensions + totalExtensionConstructionsites < 6) {
                console.log("building second extensions at ", spawnPos);
                const posX = [spawnPos.x - 3, spawnPos.x + 3, spawnPos.x, spawnPos.x, spawnPos.x + 2];
                const posY = [spawnPos.y, spawnPos.y, spawnPos.y - 3, spawnPos.y + 3, spawnPos.y + 3];
                for (let i = 0; i < 5; i++) {
                    if (!(room.createConstructionSite(posX[i], posY[i], STRUCTURE_EXTENSION) === 0)) {
                        console.log("oops, couldnt build here, idiot...");
                    }
                }
            }
            if (room.controller.level > 3 && totalExtensions + totalExtensionConstructionsites < 15) {
                console.log("building third extensions at ", spawnPos);
                const posX = [spawnPos.x - 2, spawnPos.x + 4, spawnPos.x, spawnPos.x, spawnPos.x + 2];
                const posY = [spawnPos.y - 2, spawnPos.y, spawnPos.y - 4, spawnPos.y + 4, spawnPos.y + 4];
                for (let i = 0; i < 5; i++) {
                    if (!(room.createConstructionSite(posX[i], posY[i], STRUCTURE_EXTENSION) === 0)) {
                        console.log("oops, couldnt build here, idiot... " + posX[i] + ":" + posY[i]);
                    }
                }
            }
            if (room.controller.level > 4 && totalExtensions + totalExtensionConstructionsites < 20) {
                console.log("building fourth extensions at ", spawnPos);
                const posX = [spawnPos.x - 2, spawnPos.x - 2, spawnPos.x - 2, spawnPos.x - 4, spawnPos.x - 4];
                const posY = [spawnPos.y + 2, spawnPos.y + 4, spawnPos.y - 4, spawnPos.y + 4, spawnPos.y - 4];
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

        function findContainerSpot(source) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;

                    const x = source.pos.x + dx;
                    const y = source.pos.y + dy;

                    // Kolla terrain
                    const terrain = source.room.getTerrain().get(x, y);
                    if (terrain === TERRAIN_MASK_WALL) continue;

                    // Kolla om något redan blockerar
                    const structures = source.room.lookForAt(LOOK_STRUCTURES, x, y);
                    const constructionSites = source.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);

                    if (structures.length === 0 && constructionSites.length === 0) {
                        return new RoomPosition(x, y, source.room.name);
                    }
                }
            }

            return null;
        }

        const buildContainersAtSources = (room) => {
            //check if source is in owned room
            // if (!room.controller.my) return;

            //loop sources in room
            room.memory.sources.forEach(source => {
                //check if source already has a container
                const sourceObj = Game.getObjectById(source)
                const hasContainer = _.some(sourceObj.pos.findInRange(FIND_STRUCTURES, 1),
                    s => s.structureType === STRUCTURE_CONTAINER
                );
                const hasSite = _.some(sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1),
                    s => s.structureType === STRUCTURE_CONTAINER
                );

                if (hasContainer || hasSite) return;

                //build at sourcelocation +/- 1 pos
                const spot = findContainerSpot(sourceObj);

                if (spot) {
                    const result = room.createConstructionSite(spot, STRUCTURE_CONTAINER);
                    console.log("Build result:", result);
                }
            })
        }

        function isAreaClear(room, x, y, radius) {
            const terrain = room.getTerrain();

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {

                    const tx = x + dx;
                    const ty = y + dy;

                    // ❌ utanför karta
                    if (tx <= 0 || tx >= 49 || ty <= 0 || ty >= 49) return false;

                    // ❌ wall
                    if (terrain.get(tx, ty) === TERRAIN_MASK_WALL) return false;

                    // ❌ structure redan där
                    const stuff = room.lookForAt(LOOK_STRUCTURES, tx, ty);
                    if (stuff.length > 0) return false;
                }
            }

            return true;
        }

        function findSpawnLocation(room) {
            for (let x = 6; x < 44; x++) {
                for (let y = 6; y < 44; y++) {

                    if (x <= 10 || x >= 40 || y <= 10 || y >= 40) continue;
                    if (isAreaClear(room, x, y, 5)) {
                        return new RoomPosition(x, y, room.name);
                    }

                }
            }
            return null;
        }

        const buildSpawn = (room) => {
            const pos = findSpawnLocation(room);
            if (pos) {
                room.createConstructionSite(pos, STRUCTURE_SPAWN);
            }
        }


        //preCheck if we should build stuff

        const buildersExist = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === "builder").length > 0;

        // build the stuff
        if (room.find(FIND_MY_SPAWNS).length > 0) {
            const spawnPos = room.find(FIND_MY_SPAWNS)[0].pos;
            buildExtensions(room, spawnPos);
            buildStorage(room, spawnPos);
            buildTower(room, spawnPos);
            buildContainer(room);
        } else if (room.controller.my) {
            if (room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_SPAWN}).length < 1) {
                buildSpawn(room);
            }
        }
        buildContainersAtSources(room);
    }
}

module.exports = builder;