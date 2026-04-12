var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleHauler = require('role.hauler');
var helper = require('helper');

var roleBuilder = {
    run: function (creep) {
        // const MIN_ENERGY_FOR_BUILDING = creep.room.energyCapacityAvailable > 300 ? 0 : 200;
        const MIN_ENERGY_FOR_BUILDING = 0;

        // Om inga byggen/reperationer → temp harvester-läge
        let repairSite = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => s.hits < s.hitsMax * 0.7 && s.structureType !== STRUCTURE_WALL
        });
        if (creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_STORAGE})) {

        }

        let buildSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        let allSites = [];
        for (let roomName in Game.rooms) {
            allSites = allSites.concat(Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES));
        }

        const closest = creep.pos.findClosestByPath(allSites);

        //Activates if we deactivate the despawn code
        if (!buildSite && !repairSite && allSites.length === 0) {
            if (creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester").length < 5) {
                roleHarvester.run(creep, Object.keys(Memory.sources)[4] || Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1]);
            } else {
                if (Object.keys(Memory.sources).length > 3) {
                    roleHarvester.run(creep, Object.keys(Memory.sources)[4] || Object.keys(Memory.sources)[3] || Object.keys(Memory.sources)[2] || Object.keys(Memory.sources)[1]);
                } else {
                    roleHauler.run(creep);

                }
            }
            return;
        }

        // State hantering
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0 && creep.room.energyAvailable >= MIN_ENERGY_FOR_BUILDING) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.building = true;
        }

        const towersExist = creep.room.find(FIND_STRUCTURES, {filter: structure => structure.structureType === STRUCTURE_TOWER});

        if (creep.memory.building) {
            if (repairSite && !towersExist) {
                creep.say("🔧️🧱");
                if (creep.repair(repairSite) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(repairSite, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
            } else if (buildSite) {
                creep.say("🔨🧱");
                if (creep.build(buildSite) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(buildSite, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
            } else if (allSites) {
                if (creep.room.name !== allSites[0].room.name) {
                    creep.say("🌍➡️🛠️");
                    creep.moveTo(new RoomPosition(25, 25, allSites[0].room.name), {
                        visualizePathStyle: {stroke: '#ffffff'},
                        reusePath: 20
                    });
                } else {
                    creep.say("🔨🧱🌍");
                    creep.moveTo(closest, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
                }
            }
        } else {
            // Hämta energi
            if ((((creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "harvester").length < 4 || creep.room.memory.stage < 3) && creep.room.energyAvailable < 300) || creep.room.name !== Memory.mainRoom)) {
                creep.say("⛏️⚡ → 🛠️")
                const source = creep.pos.findClosestByPath(FIND_SOURCES);
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 20});
                }
            } else {
                creep.say("🔋→🛠️")
                let target = helper.getResourceTargetExclSpawnIfPossible(creep);
                if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 20});
                }
            }
        }
    }
};

module.exports = roleBuilder;