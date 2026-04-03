var helper = {

    //find closest resource but exclude spawn when other containers/extensions exist
    getResourceTargetExclSpawnIfPossible: function (creep) {
        let targetsInclSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) =>
                (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_EXTENSION ||
                    s.structureType === STRUCTURE_SPAWN) &&
                s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        let targetsExcludingSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) =>
                (s.structureType === STRUCTURE_STORAGE ||
                s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        });
        let targetContainerOrStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0});

        if (targetContainerOrStorage)
            return targetContainerOrStorage;
        if (targetsExcludingSpawn)
            return targetsExcludingSpawn;

        const target = creep.room.energyCapacityAvailable < 350 ? targetsInclSpawn : targetsExcludingSpawn;
        if (!target) creep.say("no E!");
        return target;
    },

    getResourceTargetContainerOnly: function (creep) {
        let targetContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.store.getUsedCapacity(RESOURCE_ENERGY) > 50
        });

        if (!targetContainer) creep.say("no E!");
        return targetContainer;
    },

    getEmpireEnergyCapacity: function () {
        return _.sum(Game.rooms, function (room) {
            let cap = room.energyCapacityAvailable || 0;

            let stores = room.find(FIND_STRUCTURES, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE ||
                        s.structureType === STRUCTURE_TERMINAL;
                }
            });

            cap += _.sum(stores, function (s) {
                return s.storeCapacity || 0;
            });

            return cap;
        });
    },

    getEmpireEnergyAvailable: function () {
        return _.sum(Game.rooms, function (room) {
            let energy = room.energyAvailable || 0;

            let stores = room.find(FIND_STRUCTURES, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE ||
                        s.structureType === STRUCTURE_TERMINAL;
                }
            });

            energy += _.sum(stores, function (s) {
                return s.store && s.store.energy || 0;
            });

            return energy;
        });
    },
}
module.exports = helper;