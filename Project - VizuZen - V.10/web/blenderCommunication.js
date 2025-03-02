// blenderCommunication.js

const BlenderCommunication = {
    async sendMarkers() {
        if (typeof eel === 'undefined') {
            console.error('Eel is not defined. Make sure eel.js is properly loaded.');
            return;
        }
        const sections = DataStore.getSections();
        const markers = sections.map(section => ({
            id: section.id,
            name: section.title,
            frame: section.steps
        }));

        // Add a marker for the start frame if it doesn't exist
        if (!markers.some(marker => marker.frame === TimelineManager.startValue)) {
            markers.unshift({
                id: 'start',
                name: 'Start',
                frame: TimelineManager.startValue
            });
        }

        await eel.update_markers(markers)();
    },
    
    async jumpToNextMarker() {
        return await eel.jump_to_next_marker()();
    },

    async jumpToPreviousMarker() {
        return await eel.jump_to_previous_marker()();
    },

    async setCurrentFrame(frame) {
        await eel.set_current_frame(frame)();
    },

    async getCurrentFrame() {
        return await eel.get_current_frame()();
    }
};

// Function to be called from Python when the frame changes
eel.expose(updateCurrentFrame);
async function updateCurrentFrame(frame) {
    if (TimelineManager && TimelineManager.setCurrentFrame) {
        await TimelineManager.setCurrentFrame(frame);
    } else {
        console.error('TimelineManager is not defined or does not have setCurrentFrame method');
    }
}

// We'll initialize Blender communication in main.js now