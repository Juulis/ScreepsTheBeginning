var towerHandler = {




towerManager: function (room) {
    let towers = room.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_TOWER }});

    towers.forEach(tower => {
        // 1. Först försvara om det behövs
        let hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            tower.attack(hostile);
            return; // skippa repair om vi attackerar
        }

        // 2. Sen reparera (om tower har tillräckligt med energy)
        if (tower.energy > 200) {  // justera gränsen efter behov
            // Reparera vanliga strukturer (roads, containers, extensions osv.)
            let repairTarget = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (s) => s.hits < s.hitsMax * 0.85   // reparera om under 85%
                    && s.structureType !== STRUCTURE_WALL
                    && s.structureType !== STRUCTURE_RAMPART
            });

            if (repairTarget) {
                tower.repair(repairTarget);
            }
            // Extra: reparera walls/ramparts upp till en viss nivå (de decayar)
            else {
                let wallTarget = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART)
                        && s.hits < 5000   // eller 10000, 20000 etc. beroende på din defense
                });
                if (wallTarget) tower.repair(wallTarget);
            }
        }
    });

},


}

module.exports = towerHandler;