const ScrollManager = {
    init() {
        this.setupScrollIndicator();
        this.setupScrollHint();
        
        // Check if we need to add more padding to ensure content is scrollable
        this.ensureScrollableContent();
    },
    
    setupScrollIndicator() {
        const sectionsContainer = document.getElementById('sections-container');
        if (!sectionsContainer) return;
        
        // Add scroll event listener to show/hide scroll indicator
        sectionsContainer.addEventListener('scroll', this.debounce(() => {
            this.updateScrollIndicator(sectionsContainer);
        }, 100));
        
        // Create scroll indicator elements if they don't exist
        if (!document.getElementById('scroll-top-indicator')) {
            const topIndicator = document.createElement('div');
            topIndicator.id = 'scroll-top-indicator';
            topIndicator.className = 'scroll-indicator scroll-top';
            topIndicator.innerHTML = '<div class="arrow">↑</div>';
            topIndicator.addEventListener('click', () => {
                sectionsContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
            document.getElementById('app-container').appendChild(topIndicator);
        }
        
        if (!document.getElementById('scroll-bottom-indicator')) {
            const bottomIndicator = document.createElement('div');
            bottomIndicator.id = 'scroll-bottom-indicator';
            bottomIndicator.className = 'scroll-indicator scroll-bottom';
            bottomIndicator.innerHTML = '<div class="arrow">↓</div>';
            bottomIndicator.addEventListener('click', () => {
                sectionsContainer.scrollTo({
                    top: sectionsContainer.scrollHeight,
                    behavior: 'smooth'
                });
            });
            document.getElementById('app-container').appendChild(bottomIndicator);
        }
        
        // Initial update
        this.updateScrollIndicator(sectionsContainer);
    },
    
    updateScrollIndicator(container) {
        const topIndicator = document.getElementById('scroll-top-indicator');
        const bottomIndicator = document.getElementById('scroll-bottom-indicator');
        
        if (!topIndicator || !bottomIndicator) return;
        
        // Show top indicator when not at the top
        if (container.scrollTop > 50) {
            topIndicator.classList.add('visible');
        } else {
            topIndicator.classList.remove('visible');
        }
        
        // Show bottom indicator when not at the bottom
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        if (!isAtBottom && container.scrollHeight > container.clientHeight) {
            bottomIndicator.classList.add('visible');
        } else {
            bottomIndicator.classList.remove('visible');
        }
    },
    
    setupScrollHint() {
        const sectionsContainer = document.getElementById('sections-container');
        if (!sectionsContainer) return;
        
        // Add a hint element if it doesn't exist
        if (!document.getElementById('scroll-hint')) {
            const hint = document.createElement('div');
            hint.id = 'scroll-hint';
            hint.innerHTML = 'Scroll to see more content';
            hint.className = 'scroll-hint';
            document.getElementById('app-container').appendChild(hint);
            
            // Hide hint when user scrolls
            sectionsContainer.addEventListener('scroll', () => {
                hint.classList.add('hiding');
                setTimeout(() => {
                    hint.style.display = 'none';
                }, 500);
            });
            
            // Only show hint if content is scrollable
            setTimeout(() => {
                if (sectionsContainer.scrollHeight > sectionsContainer.clientHeight) {
                    hint.classList.add('visible');
                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        hint.classList.add('hiding');
                        setTimeout(() => {
                            hint.style.display = 'none';
                        }, 500);
                    }, 5000);
                }
            }, 1000);
        }
    },
    
    ensureScrollableContent() {
        const sectionsContainer = document.getElementById('sections-container');
        if (!sectionsContainer) return;
        
        // Check if we need to add a spacer to ensure content is scrollable
        setTimeout(() => {
            if (sectionsContainer.scrollHeight <= sectionsContainer.clientHeight) {
                // Content doesn't need scrolling yet, but add padding at the bottom
                // to ensure the scrollbar appears when adding content
                sectionsContainer.style.paddingBottom = '100px';
            }
        }, 500);
    },
    
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// Initialize scroll manager after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ScrollManager.init();
});