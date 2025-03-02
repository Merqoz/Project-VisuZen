// timelineManager.js

const TimelineManager = {
    startValue: 1,
    isFolded: false,
    isUpdating: false, // New: Added for sync protection

    init() {
        this.addFoldButton();
        this.setupEventListeners();
        this.adjustSectionHeight();
        window.addEventListener('resize', this.adjustSectionHeight.bind(this));
        this.initBlenderSync(); // New: Initialize Blender sync
    },

    // New: Blender sync methods
    initBlenderSync() {
        eel.expose(this.handleBlenderFrameUpdate.bind(this), 'updateCurrentFrame');
        this.syncWithBlender();
    },

    async syncWithBlender() {
        try {
            const currentFrame = await eel.get_current_frame()();
            this.updateUIWithoutBlenderSync(parseInt(currentFrame));
        } catch (error) {
            console.error('Error syncing with Blender:', error);
        }
    },

    handleBlenderFrameUpdate(frame) {
        if (!this.isUpdating) {
            this.updateUIWithoutBlenderSync(parseInt(frame));
        }
    },

    updateUIWithoutBlenderSync(frame) {
        const slider = document.getElementById('timeline-slider');
        if (slider) {
            slider.value = frame;
        }
        this.updateCurrentStep(frame);
    },

    addFoldButton() {
        const bottomFeature = document.getElementById('bottom-feature');
        if (!bottomFeature) return;
        const foldButton = document.createElement('button');
        foldButton.id = 'fold-button';
        foldButton.innerHTML = '▲'; // Up arrow for folding
        bottomFeature.insertBefore(foldButton, bottomFeature.firstChild);
    },

    setupEventListeners() {
        const foldButton = document.getElementById('fold-button');
        const sectionSlider = document.getElementById('section-slider');
        const timelineSlider = document.getElementById('timeline-slider');
        
        if (foldButton) {
            foldButton.addEventListener('click', this.toggleFold.bind(this));
        }
        
        if (sectionSlider) {
            sectionSlider.addEventListener('click', this.handleSectionClick.bind(this));
        }
        
        if (timelineSlider) {
            // Listen to both 'input' (while dragging) and 'change' (when released) events
            timelineSlider.addEventListener('input', this.handleTimelineSliderChange.bind(this));
            timelineSlider.addEventListener('change', this.handleTimelineSliderChange.bind(this));
            
            // Initialize the display with the current value
            const currentStep = parseInt(timelineSlider.value);
            this.updateCurrentStep(currentStep);
        }
    },

    handleSectionClick(event) {
        if (event.target.classList.contains('slider-section')) {
            const sectionId = parseInt(event.target.dataset.id);
            this.jumpToSection(sectionId);
        }
    },

    async jumpToSection(sectionId) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === sectionId);
        
        if (section) {
            await this.setCurrentFrame(section.steps);
            
            const sectionElement = document.querySelector(`.section[data-id="${sectionId}"]`);
            if (sectionElement) {
                this.highlightSection(sectionElement);
                setTimeout(() => {
                    this.scrollToSection(sectionElement);
                }, 2000);
            }
        }
    },

    scrollToSection(sectionElement) {
        const topSection = document.getElementById('top-section');
        const topSectionHeight = topSection ? topSection.offsetHeight : 0;
        
        const rect = sectionElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        const targetScrollPosition = rect.top + scrollTop - topSectionHeight - 20;

        window.scrollTo({
            top: targetScrollPosition,
            behavior: 'smooth'
        });
    },

    highlightSection(sectionElement) {
        if (sectionElement) {
            sectionElement.classList.add('highlight');
            setTimeout(() => {
                sectionElement.classList.remove('highlight');
            }, 2000);
        }
    },

    handleTimelineSliderChange(event) {
        if (this._isUpdating) return;
        
        this._isUIUpdate = true;
        const currentStep = parseInt(event.target.value);
        
        // Directly update the step value DOM element for immediate feedback
        const stepValue = document.getElementById('step-value');
        if (stepValue) {
            stepValue.textContent = currentStep;
        }
        
        // Update the current section name
        const currentSectionElement = document.getElementById('current-section-name');
        if (currentSectionElement) {
            const currentSection = this.getCurrentSection(currentStep);
            if (currentStep === this.startValue) {
                currentSectionElement.textContent = 'Current Section: Start';
            } else if (currentSection) {
                currentSectionElement.textContent = `Current Section: ${currentSection.title}`;
            } else {
                currentSectionElement.textContent = 'Current Section: None';
            }
        }
        
        // Clear any existing timeout
        clearTimeout(this._updateTimeout);
        
        // Set a new timeout for debouncing
        this._updateTimeout = setTimeout(() => {
            // Call the full updateCurrentStep for any additional updates
            this.updateCurrentStep(currentStep);
            // Send update to Blender
            this.setCurrentFrame(currentStep);
        }, 50);
    },

    toggleFold() {
        const bottomFeature = document.getElementById('bottom-feature');
        const foldButton = document.getElementById('fold-button');
        
        if (!bottomFeature || !foldButton) return;
        
        this.isFolded = !this.isFolded;
        
        if (this.isFolded) {
            bottomFeature.classList.add('folded');
            foldButton.innerHTML = '▼';
        } else {
            bottomFeature.classList.remove('folded');
            foldButton.innerHTML = '▲';
        }

        this.adjustSectionHeight();
    },

    adjustSectionHeight() {
        const sectionsContainer = document.getElementById('sections-container');
        const bottomFeature = document.getElementById('bottom-feature');
        const topSection = document.getElementById('top-section');

        if (!sectionsContainer || !bottomFeature || !topSection) {
            console.warn('Required elements not found for adjustSectionHeight');
            return;
        }

        const windowHeight = window.innerHeight;
        const topSectionHeight = topSection.offsetHeight;
        const bottomFeatureHeight = this.isFolded ? 40 : bottomFeature.offsetHeight;

        const availableHeight = windowHeight - topSectionHeight - bottomFeatureHeight;
        sectionsContainer.style.height = `${availableHeight}px`;
        sectionsContainer.style.overflowY = 'auto';
    },

    // Modified: Updated to handle Blender sync
    async setCurrentFrame(frame) {
        if (this.isUpdating) return;

        try {
            this.isUpdating = true;
            const slider = document.getElementById('timeline-slider');
            if (slider) {
                slider.value = frame;
            }
            
            this.updateCurrentStep(frame);

            // Update Blender's timeline
            await eel.update_timeline(frame)();
        } catch (error) {
            console.error('Error setting current frame:', error);
        } finally {
            this.isUpdating = false;
        }
    },

    async updateTimelineSlider() {
        console.log('Updating timeline slider');
        const slider = document.getElementById('timeline-markers');
        if (!slider) return;
        
        slider.innerHTML = '';
        const sections = DataStore.getSections();
        const maxTimelineValue = DataStore.getMaxTimelineValue();

        const defaultMarker = document.createElement('div');
        defaultMarker.className = 'timeline-marker default-marker';
        defaultMarker.style.left = '0%';
        defaultMarker.title = `Start (${this.startValue})`;
        slider.appendChild(defaultMarker);

        sections.forEach((section) => {
            const marker = document.createElement('div');
            marker.className = section.level === 0 ? 'timeline-marker main-section' : 'timeline-marker sub-section';
            const relativePosition = ((section.steps - this.startValue) / (maxTimelineValue - this.startValue)) * 100;
            marker.style.left = `${relativePosition}%`;
            marker.title = `${section.title} (Step ${section.steps})`;
            slider.appendChild(marker);
        });

        const timelineSlider = document.getElementById('timeline-slider');
        if (timelineSlider) {
            timelineSlider.min = this.startValue;
            timelineSlider.max = maxTimelineValue;
            timelineSlider.value = Math.max(this.startValue, timelineSlider.value);
        }

        this.updateSectionSlider();

        if (BlenderCommunication) {
            await BlenderCommunication.sendMarkers();
        }
    },

    updateSectionSlider() {
        const sectionSlider = document.getElementById('section-slider');
        if (!sectionSlider) return;
        
        sectionSlider.innerHTML = '';
        const mainSections = DataStore.getSections().filter(s => s.level === 0);
        const sectionWidth = 100 / mainSections.length;

        mainSections.forEach((section, index) => {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'slider-section';
            sectionElement.textContent = section.title;
            sectionElement.style.width = `${sectionWidth}%`;
            sectionElement.style.left = `${index * sectionWidth}%`;
            sectionElement.dataset.id = section.id;
            sectionSlider.appendChild(sectionElement);
        });
    },

    // Modified: Updated to handle sync protection
    updateCurrentStep(currentStep) {
        // Validate the input
        if (currentStep === undefined || currentStep === null) {
            console.warn('Invalid step value provided to updateCurrentStep');
            return;
        }
    
        // Ensure we have a number
        currentStep = parseInt(currentStep);
        if (isNaN(currentStep)) {
            console.warn('Non-numeric step value provided to updateCurrentStep');
            return;
        }
    
        try {
            // Update step value display
            const stepValue = document.getElementById('step-value');
            if (stepValue) {
                stepValue.textContent = currentStep;
                console.log('Step value updated to:', currentStep); // Debug log
            } else {
                console.warn('step-value element not found');
            }
            
            // Update max step value
            const maxStepValue = document.getElementById('max-step-value');
            if (maxStepValue) {
                maxStepValue.textContent = DataStore.getMaxTimelineValue();
            } else {
                console.warn('max-step-value element not found');
            }
    
            // Update current section name
            const currentSectionElement = document.getElementById('current-section-name');
            if (currentSectionElement) {
                const currentSection = this.getCurrentSection(currentStep);
                if (currentStep === this.startValue) {
                    currentSectionElement.textContent = 'Current Section: Start';
                } else if (currentSection) {
                    currentSectionElement.textContent = `Current Section: ${currentSection.title}`;
                } else {
                    currentSectionElement.textContent = 'Current Section: None';
                }
            } else {
                console.warn('current-section-name element not found');
            }
        } catch (error) {
            console.error('Error in updateCurrentStep:', error);
        }
    },

    getCurrentSection(stepValue) {
        if (stepValue === this.startValue) {
            return null;
        }
        const sections = DataStore.getSections();
        sections.sort((a, b) => b.steps - a.steps);
        return sections.find(section => stepValue >= section.steps);
    },

    async navigateToNextSection() {
        console.log('Navigating to next section');
        const timelineSlider = document.getElementById('timeline-slider');
        if (!timelineSlider) return;
        
        const currentStep = parseInt(timelineSlider.value);
        const sections = DataStore.getSections();
        
        if (currentStep === this.startValue) {
            const firstSection = sections[0];
            if (firstSection) {
                await this.setCurrentFrame(firstSection.steps);
            }
        } else {
            const nextSection = sections.find(s => s.steps > currentStep);
            if (nextSection) {
                await this.setCurrentFrame(nextSection.steps);
            }
        }
    },

    async navigateToPreviousSection() {
        console.log('Navigating to previous section');
        const timelineSlider = document.getElementById('timeline-slider');
        if (!timelineSlider) return;
        
        const currentStep = parseInt(timelineSlider.value);
        const sections = DataStore.getSections();
        
        if (currentStep > this.startValue && currentStep <= sections[0].steps) {
            await this.setCurrentFrame(this.startValue);
        } else {
            const previousSection = sections.reverse().find(s => s.steps < currentStep);
            if (previousSection) {
                await this.setCurrentFrame(previousSection.steps);
            }
        }
    },

    updateStartAndMaxValue() {
        const currentMax = DataStore.getMaxTimelineValue();
        
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3>Update Timeline Values</h3>
                <div style="margin-bottom: 10px;">
                    <label for="start-value">Start Value:</label>
                    <input type="number" id="start-value" value="${this.startValue}" style="width: 100px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="max-value">Max Value:</label>
                    <input type="number" id="max-value" value="${currentMax}" style="width: 100px;">
                </div>
                <div>
                    <button id="update-button">Update</button>
                    <button id="cancel-button">Cancel</button>
                </div>
            </div>
        `;
        
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        
        document.body.appendChild(dialog);
        
        const updateButton = dialog.querySelector('#update-button');
        const cancelButton = dialog.querySelector('#cancel-button');
        
        updateButton.addEventListener('click', () => {
            const newStart = parseInt(dialog.querySelector('#start-value').value);
            const newMax = parseInt(dialog.querySelector('#max-value').value);
            
            if (!isNaN(newStart) && !isNaN(newMax) && newStart < newMax) {
                const oldStartValue = this.startValue;
                this.startValue = newStart;
                DataStore.setMaxTimelineValue(newMax);

                this.adjustSectionSteps(oldStartValue, newStart);
                this.updateTimelineSlider();
                this.updateCurrentStep(this.startValue);
                this.updateSectionHeaders();
                SectionManager.renderSections();
                
                document.body.removeChild(dialog);
            } else {
                alert("Invalid input. Please ensure start value is less than max value and both are numbers.");
            }
        });
        
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    },

    updateSectionHeaders() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(sectionElement => {
            const sectionId = parseInt(sectionElement.dataset.id);
            const section = DataStore.getSections().find(s => s.id === sectionId);
            if (section) {
                const stepsCounter = sectionElement.querySelector('.steps-counter');
                if (stepsCounter) {
                    stepsCounter.textContent = section.steps;
                }
            }
        });
    },

    adjustSectionSteps(oldStartValue, newStartValue) {
        const sections = DataStore.getSections();
        const shift = newStartValue - oldStartValue;
        
        sections.forEach(section => {
            if (!section.frozen) {
                section.steps += shift;
            }
        });

        sections.sort((a, b) => a.steps - b.steps);
        DataStore.setSections(sections);
    },

    toggleSectionFreeze(sectionId) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === sectionId);
        if (section) {
            section.frozen = !section.frozen;
            DataStore.setSections(sections);
            this.updateSectionHeaders();
            SectionManager.renderSections();
        }
    }
};

// Initialize TimelineManager when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    TimelineManager.init();
});