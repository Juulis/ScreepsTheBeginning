var roleWarrior = {

    /** @param {Creep} creep **/
    run: function (creep) {

        // Vänta in armén
        const armySize = 2;
        const warriors = Object.values(Game.creeps).filter(c => c.memory.role === 'warrior' && c.ticksToLive > 50).length;
        if (warriors < armySize) {
            creep.say('⏳');
            return;
        }

        let target = Memory.hostilesNearby[0];
        if (target) {
            creep.say('⚔️', true);
            if (creep.pos.inRangeTo(target, 1)) {
                creep.attack(target);
            } else {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ff4f4f'}});
            }
        } else {
            // Ingen fiende alls, gå hem och vänta
            if (creep.room.name !== creep.memory.mainRoom) {
                creep.say("🛡️➡️🏠")
                creep.moveTo(Game.rooms[creep.memory.mainRoom].find(FIND_MY_SPAWNS)[0], {visualizePathStyle: {stroke: '#ff4f4f'}})
            } else {
                creep.say('🛡️', true);
                let flag = Game.flags['Defend'] || Game.flags['Rally'];
                if (flag) {
                    creep.moveTo(flag, {visualizePathStyle: {stroke: '#ffff00'}});
                } else {
                    creep.moveTo(creep.room.find(FIND_MY_SPAWNS)[0]);
                }
            }
        }
    }
};

module.exports = roleWarrior;