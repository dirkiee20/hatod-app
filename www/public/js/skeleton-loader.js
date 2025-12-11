// Skeleton Loader Utility
// Provides skeleton screens and progressive loading for better UX

class SkeletonLoader {
    constructor() {
        this.skeletons = new Map();
    }

    // Create skeleton HTML for cart items
    createCartSkeleton(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card mb-4">
                    <div class="flex gap-4">
                        <div class="skeleton skeleton-image w-24 h-24 rounded-lg flex-shrink-0"></div>
                        <div class="flex-1">
                            <div class="skeleton skeleton-text h-5 mb-2 w-3/4"></div>
                            <div class="skeleton skeleton-text h-4 mb-2 w-1/2"></div>
                            <div class="flex items-center justify-between mt-3">
                                <div class="skeleton skeleton-text h-6 w-20"></div>
                                <div class="flex items-center gap-2">
                                    <div class="skeleton skeleton-button w-8 h-8 rounded"></div>
                                    <div class="skeleton skeleton-text h-5 w-8"></div>
                                    <div class="skeleton skeleton-button w-8 h-8 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    // Create skeleton for order history items
    createOrderSkeleton(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card mb-4">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <div class="skeleton skeleton-text h-5 mb-2 w-1/3"></div>
                            <div class="skeleton skeleton-text h-4 mb-1 w-1/2"></div>
                        </div>
                        <div class="skeleton skeleton-status w-24 h-6 rounded-full"></div>
                    </div>
                    <div class="flex gap-3 mb-3">
                        <div class="skeleton skeleton-image w-16 h-16 rounded-lg"></div>
                        <div class="flex-1">
                            <div class="skeleton skeleton-text h-4 mb-2 w-full"></div>
                            <div class="skeleton skeleton-text h-4 mb-1 w-2/3"></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between pt-3 border-t border-border">
                        <div class="skeleton skeleton-text h-5 w-32"></div>
                        <div class="skeleton skeleton-button w-24 h-8 rounded"></div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    // Create skeleton for checkout summary
    createCheckoutSkeleton() {
        return `
            <div class="skeleton-card">
                <div class="skeleton skeleton-text h-6 mb-4 w-1/2"></div>
                <div class="space-y-3 mb-4">
                    <div class="flex justify-between">
                        <div class="skeleton skeleton-text h-4 w-24"></div>
                        <div class="skeleton skeleton-text h-4 w-20"></div>
                    </div>
                    <div class="flex justify-between">
                        <div class="skeleton skeleton-text h-4 w-32"></div>
                        <div class="skeleton skeleton-text h-4 w-16"></div>
                    </div>
                    <div class="flex justify-between">
                        <div class="skeleton skeleton-text h-4 w-28"></div>
                        <div class="skeleton skeleton-text h-4 w-18"></div>
                    </div>
                </div>
                <div class="border-t border-border pt-3 mt-4">
                    <div class="flex justify-between mb-4">
                        <div class="skeleton skeleton-text h-6 w-24"></div>
                        <div class="skeleton skeleton-text h-6 w-32"></div>
                    </div>
                    <div class="skeleton skeleton-button w-full h-12 rounded-lg"></div>
                </div>
            </div>
        `;
    }

    // Create skeleton for order tracking
    createTrackingSkeleton() {
        return `
            <div class="skeleton-card">
                <div class="skeleton skeleton-text h-6 mb-4 w-1/3"></div>
                <div class="space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="skeleton skeleton-image w-12 h-12 rounded-full"></div>
                        <div class="flex-1">
                            <div class="skeleton skeleton-text h-4 mb-2 w-2/3"></div>
                            <div class="skeleton skeleton-text h-3 w-1/2"></div>
                        </div>
                    </div>
                    <div class="skeleton skeleton-text h-32 w-full rounded-lg"></div>
                </div>
            </div>
        `;
    }

    // Show skeleton in container
    showSkeleton(containerId, skeletonHtml) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = skeletonHtml;
            container.classList.remove('hidden');
        }
    }

    // Hide skeleton and show content
    hideSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            // Fade out skeleton
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.2s ease-out';
            setTimeout(() => {
                container.classList.add('hidden');
                container.style.opacity = '1';
            }, 200);
        }
    }
}

// Export singleton instance
window.SkeletonLoader = new SkeletonLoader();

