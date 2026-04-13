var roleWarrior = {

    /** @param {Creep} creep **/
    run: function (creep) {

        // Vänta in armén
        const armySize = 3;
        const warriors = Object.values(Game.creeps).filter(creep => creep.memory.role === 'warrior').length;
        if (warriors < armySize) return;

        // 1. Hitta närmaste fiende
        let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

        if (target) {
            // Attackera om vi är nära nog
            if (creep.pos.inRangeTo(target, 1)) {
                creep.attack(target);
            }
            // Annars rör dig mot målet
            else {
                creep.moveTo(target, {
                    visualizePathStyle: {stroke: '#ff0000'}
                });
            }

            // Optional: ropa ut vad vi gör (bra för debugging)
            creep.say('⚔️', true);

        } else {
            // Inga fiender → gå till en samlingspunkt eller idle
            let flag = Game.flags['Defend'] || Game.flags['Rally'];

            if (flag) {
                creep.moveTo(flag, {
                    visualizePathStyle: {stroke: '#ffff00'}
                });
            } else {
                // Inga flaggor → stå stilla eller gå till spawn
                creep.moveTo(creep.room.find(FIND_MY_SPAWNS)[0]);
            }

            creep.say('🛡️', true);
        }
    }
};

module.exports = roleWarrior;