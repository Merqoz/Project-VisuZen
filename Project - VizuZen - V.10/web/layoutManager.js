const LayoutManager = {
    init() {
        this.setupEventListeners();
        this.setupResizeObserver();
        this.initialLayout();
    },

    initialLayout() {
        // Wait for DOM elements to be fully rendered
        setTimeout(() => {
            this.adjustLayout();
            // Setup mutation observer to detect content changes
            this.setupMutationObserver();
        }, 200);
    },

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.adjustLayout();
        }, 100));

        // Handle timeline folding/unfolding
        const foldButton = document.getElementById('fold-button');
        if (foldButton) {
            const originalClick = foldButton.onclick;
            foldButton.onclick = (e) => {
                if (originalClick) originalClick.call(foldButton, e);
                // Wait for animation to complete
                setTimeout(() => this.adjustLayout(), 300);
            };
        }
    },

    setupResizeObserver() {
        // Create a ResizeObserver to detect changes in element sizes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(this.debounce(() => {
                this.adjustLayout();
            }, 100));
            
            // Observe top section and bottom feature
            const topSection = document.getElementById('top-section');
            const bottomFeature = document.getElementById('bottom-feature');
            
            if (topSection) resizeObserver.observe(topSection);
            if (bottomFeature) resizeObserver.observe(bottomFeature);
        }
    },

    setupMutationObserver() {
        // Create a MutationObserver to detect DOM changes
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer && window.MutationObserver) {
            const observer = new MutationObserver(this.debounce((mutations) => {
                // Only adjust layout if there are childList changes (elements added/removed)
                if (mutations.some(m => m.type === 'childList')) {
                    this.adjustLayout();
                }
            }, 100));
            
            observer.observe(sectionsContainer, { 
                childList: true, 
                subtree: true 
            });
        }
    },

    adjustLayout() {
        const topSection = document.getElementById('top-section');
        const bottomFeature = document.getElementById('bottom-feature');
        const appContainer = document.getElementById('app-container');
        const sectionsContainer = document.getElementById('sections-container');
        
        if (!topSection || !bottomFeature || !appContainer || !sectionsContainer) {
            console.warn('LayoutManager: Required elements not found');
            return;
        }
        
        // Get current dimensions
        const windowHeight = window.innerHeight;
        const topHeight = topSection.offsetHeight;
        const bottomHeight = bottomFeature.offsetHeight;
        
        // Calculate available space for sections container
        const availableHeight = windowHeight - topHeight - bottomHeight;
        
        // Apply calculated height
        sectionsContainer.style.height = `${Math.max(availableHeight, 100)}px`;
        
        // Update app container to ensure it fills the space between top and bottom
        appContainer.style.height = `${windowHeight - topHeight}px`;
        
        console.log('Layout adjusted: ', {
            windowHeight,
            topHeight,
            bottomHeight,
            availableHeight
        });
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    },

    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    },

    // Add this to main.js or call it after DOM is loaded
    enhanceSectionManager() {
        if (SectionManager) {
            // Enhance renderSections with loading indicator
            const originalRenderSections = SectionManager.renderSections;
            SectionManager.renderSections = async function() {
                LayoutManager.showLoadingIndicator();
                try {
                    await originalRenderSections.call(this);
                } finally {
                    LayoutManager.hideLoadingIndicator();
                    LayoutManager.adjustLayout();
                }
            };
            
            // Enhance addSection with layout adjustment
            const originalAddSection = SectionManager.addSection;
            SectionManager.addSection = async function() {
                await originalAddSection.call(this);
                LayoutManager.adjustLayout();
            };
            
            // Enhance removeSection with layout adjustment
            const originalRemoveSection = SectionManager.removeSection;
            SectionManager.removeSection = async function(id) {
                await originalRemoveSection.call(this, id);
                LayoutManager.adjustLayout();
            };
        }
    }
};

// Initialize layout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LayoutManager.init();
    LayoutManager.enhanceSectionManager();
});