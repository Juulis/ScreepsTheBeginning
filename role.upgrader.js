var roleHarvester = require('role.harvester');
var helper = require('helper');

var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function (creep) {

        const myRooms = Object.values(Game.rooms)
            .filter(r => r.controller && r.controller.my);

        const targetRoom = _.find(myRooms, room =>
            _.filter(Game.creeps, c =>
                c.memory.role === 'upgrader' &&
                c.memory.targetRoom === room.name
            ).length < 2
        );

        if (targetRoom && !creep.memory.targetRoom) {
            creep.memory.targetRoom = targetRoom.name;
        }

        if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
            creep.say("🏛️➡️🌍 " + creep.memory.targetRoom);
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {
                visualizePathStyle: {stroke: '#ffffff'},
                reusePath: 50
            });
            return;
        }

        // const MIN_ENERGY_FOR_UPGRADE = creep.room.energyCapacityAvailable < 500 ? 150 : 300;
        const MIN_ENERGY_FOR_UPGRADE = 0;

        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0 && helper.getEmpireEnergyAvailable() > MIN_ENERGY_FOR_UPGRADE) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
        }

        let buildSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);

        if (buildSite && creep.memory.upgrading && creep.room.name !== Memory.mainRoom && creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role === "builder").length < 1) {
            creep.say('🏛️ 🧱');
            if (creep.build(buildSite) == ERR_NOT_IN_RANGE) {
                creep.moveTo(buildSite, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 40});
            }
            return;
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