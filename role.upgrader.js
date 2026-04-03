var roleHarvester = require('role.harvester');
var helper = require('helper');

var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function (creep) {
        // const MIN_ENERGY_FOR_UPGRADE = creep.room.energyCapacityAvailable < 500 ? 150 : 300;
        const MIN_ENERGY_FOR_UPGRADE = 0;

        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0 && helper.getEmpireEnergyAvailable() > MIN_ENERGY_FOR_UPGRADE) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
        }


        if (creep.memory.upgrading) {
            creep.say('🏛️ ⚡️');
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 20});
            }
        } else {
            creep.say('🏛️ 🔋️');
            let target = helper.getResourceTargetExclSpawnIfPossible(creep);
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}, reusePath: 20});
            }
        }
    }
};
module.exports = roleUpgrader;