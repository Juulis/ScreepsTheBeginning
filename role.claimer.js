class RoleClaimer {
    static run(creep) {
        // Hämta target room från memory
        if (!creep.memory.targetRoom || creep.memory.targetRoom === Memory.mainRoom) {
            creep.memory.targetRoom = this.getNextRoom(creep);
        }

        const targetRoom = creep.memory.targetRoom;

        // Gå till rätt rum
        if (creep.room.name !== targetRoom) {
            creep.say("🚩🌍➡️" + creep.memory.targetRoom)
            creep.moveTo(new RoomPosition(25, 25, targetRoom));
            return;
        }

        const controller = creep.room.controller;
        if (!controller) return;

        // Om vi kan claima (GCL + neutral)
        if (!controller.owner && Game.gcl.level > Object.keys(Game.rooms).length) {
            creep.say("🚩🌍")
            if (creep.claimController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}, reusePath: 50});
            }
            return;
        }

        // Annars reservera
        if (
            !controller.reservation ||
            !controller.my ||
            controller.reservation.ticksToEnd < 1000
        ) {
            if (controller.reservation) {
                creep.say("🏳️🌍|" + controller.reservation.ticksToEnd);
            } else {
                creep.say("🏳️🌍|0");
            }
            if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
            return;
        }

        // Redan reserverat → välj nytt rum
        creep.memory.targetRoom = this.getNextRoom(creep);
    }

    static getNextRoom(creep) {
        const rooms = new Set();

        // Samla alla rooms från dina sources
        for (let id in Memory.sources) {
            rooms.add(Memory.sources[id].roomName);
        }

        // Hitta första rum som inte är reserverat
        for (let roomName of rooms) {
            const claimersAlreadyInRoom = (_.filter(Game.creeps, c =>
                    c.memory.role === 'claimer' &&
                    c.room.name === creep.memory.targetRoom).length > 0
            );

            if (claimersAlreadyInRoom) continue;

            const room = Game.rooms[roomName];

            if (roomName === Memory.mainRoom) continue;

            if (!room) return roomName; // ingen vision → gå dit

            const controller = room.controller;
            if (!controller) continue;

            if (
                !controller.reservation ||
                controller.reservation.username !== creep.owner.username ||
                controller.reservation.ticksToEnd < 1000
            ) {
                return roomName;
            }
        }

        return null;
    }
}

module.exports = RoleClaimer;