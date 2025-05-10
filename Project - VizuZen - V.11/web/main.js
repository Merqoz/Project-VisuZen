// main.js

async function initializeApplication() {
    console.log('Initializing application...');

    try {
        // Use default layout
        DataStore.resetToDefault();
        console.log('Using default layout:', DataStore.getSections());

        // Initialize UI
        SectionManager.renderSections();
        UIManager.updateSlider();
        await TimelineManager.updateTimelineSlider();
        TimelineManager.updateCurrentStep();

        // Set up event listeners with null checks
        const addSectionBtn = document.getElementById('add-section');
        if (addSectionBtn) {
            addSectionBtn.addEventListener('click', SectionManager.addSection.bind(SectionManager));
        } else {
            console.warn('Add section button not found');
        }

        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.addEventListener('input', async function(e) {
                const frame = parseInt(e.target.value);
                await TimelineManager.setCurrentFrame(frame);
            });
        } else {
            console.warn('Timeline slider not found');
        }

        const prevButton = document.getElementById('timeline-prev');
        if (prevButton) {
            prevButton.addEventListener('click', async () => {
                await TimelineManager.navigateToPreviousSection();
            });
        } else {
            console.warn('Previous button not found');
        }

        const nextButton = document.getElementById('timeline-next');
        if (nextButton) {
            nextButton.addEventListener('click', async () => {
                await TimelineManager.navigateToNextSection();
            });
        } else {
            console.warn('Next button not found');
        }

        const changeStartMaxBtn = document.getElementById('change-start-and-max-value');
        if (changeStartMaxBtn) {
            changeStartMaxBtn.addEventListener('click', TimelineManager.updateStartAndMaxValue.bind(TimelineManager));
        } else {
            console.warn('Change start and max value button not found');
        }

        // Global click handler for dynamically added buttons
        document.body.addEventListener('click', function(event) {
            if (event.target.matches('button')) {
                const action = event.target.getAttribute('data-action');
                const sectionId = event.target.getAttribute('data-section-id');
                if (action && sectionId) {
                    switch(action) {
                        case 'add-subsection':
                            SectionManager.addSubSection(parseInt(sectionId));
                            break;
                        case 'add-feature':
                            SectionManager.addFeature(parseInt(sectionId));
                            break;
                        case 'remove':
                            SectionManager.removeSection(parseInt(sectionId));
                            break;
                    }
                }
            }
        });

        SectionManager.setupDragAndDrop();

        // Initialize Blender communication
        try {
            // Initial sync of markers
            await BlenderCommunication.sendMarkers();
            
            // Get the initial current frame
            const currentFrame = await BlenderCommunication.getCurrentFrame();
            await TimelineManager.setCurrentFrame(currentFrame);

            console.log('Blender communication initialized successfully');
        } catch (error) {
            console.error('Error initializing Blender communication:', error);
        }

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Run the initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApplication);

// For debugging purposes
window.addSection = SectionManager.addSection.bind(SectionManager);