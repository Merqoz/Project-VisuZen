// uiManager.js

const UIManager = {
    updateSlider() {
        const slider = document.getElementById('section-slider');
        slider.innerHTML = '';
        const mainSections = DataStore.getSections().filter(s => s.level === 0);
        const sectionWidth = 100 / mainSections.length;
        mainSections.forEach((section, index) => {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'slider-section';
            sectionElement.textContent = section.title;
            sectionElement.style.width = `${sectionWidth}%`;
            sectionElement.style.left = `${index * sectionWidth}%`;
            sectionElement.draggable = true;
            sectionElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', section.id);
            });
            slider.appendChild(sectionElement);
        });
    },

    updateDropIndicator(y) {
        this.removeDropIndicator();
        const sections = document.querySelectorAll('.section');
        let dropIndex = 0;
        for (let i = 0; i < sections.length; i++) {
            const rect = sections[i].getBoundingClientRect();
            if (y > rect.top + rect.height / 2) {
                dropIndex = i + 1;
            } else {
                break;
            }
        }
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.top = dropIndex < sections.length ? 
            sections[dropIndex].offsetTop + 'px' : 
            sections[sections.length - 1].offsetTop + sections[sections.length - 1].offsetHeight + 'px';
        indicator.style.height = '10px';
        document.body.appendChild(indicator);
    },

    removeDropIndicator() {
        const indicator = document.querySelector('.drop-indicator');
        if (indicator) indicator.remove();
    }
};