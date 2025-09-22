// SmartBiz Intelligence Demo JavaScript

// Chart.js configuration
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#6b7280';

// Demo state
let demoActive = false;
let currentTab = 'overview';

// Initialize demo
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    initializeAnimations();
});

// Chart initialization
function initializeCharts() {
    // Hero chart
    const heroCtx = document.getElementById('heroChart');
    if (heroCtx) {
        new Chart(heroCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Growth',
                    data: [12, 19, 15, 25, 32, 45],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    // Website chart
    const websiteCtx = document.getElementById('websiteChart');
    if (websiteCtx) {
        new Chart(websiteCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Visitors',
                    data: [2100, 2300, 2650, 2847],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                }
            }
        });
    }
}

// Animation initialization
function initializeAnimations() {
    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

// Demo functionality
function startDemo() {
    const demoContainer = document.getElementById('demoContainer');
    const demoStart = document.getElementById('demoStart');

    if (demoContainer && demoStart) {
        demoStart.style.display = 'none';
        demoContainer.style.display = 'block';
        demoActive = true;

        // Scroll to demo
        demoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Initialize demo charts
        setTimeout(() => {
            initializeDemoCharts();
            animateMetrics();
        }, 500);
    }
}

function initializeDemoCharts() {
    // Re-initialize charts when demo becomes visible
    const websiteCtx = document.getElementById('websiteChart');
    if (websiteCtx && websiteCtx.offsetParent !== null) {
        initializeCharts();
    }
}

function animateMetrics() {
    // Animate metric numbers
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        const finalValue = metric.textContent;
        const numericValue = parseInt(finalValue.replace(/[^0-9]/g, ''));
        if (numericValue) {
            animateNumber(metric, 0, numericValue, finalValue, 1500);
        }
    });
}

function animateNumber(element, start, end, suffix, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }

        const formatted = Math.floor(current).toLocaleString();
        element.textContent = suffix.replace(/[0-9,]+/, formatted);
    }, 16);
}

// Tab functionality
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    currentTab = tabName;

    // Reinitialize charts if needed
    if (tabName === 'overview') {
        setTimeout(initializeDemoCharts, 100);
    }
}

// Demo payment processing
function processDemoPayment() {
    const modal = document.getElementById('demoModal');
    modal.style.display = 'block';

    // Simulate payment processing steps
    const steps = document.querySelectorAll('.processing-step');
    let currentStep = 0;

    const processNextStep = () => {
        if (currentStep < steps.length - 1) {
            steps[currentStep].classList.add('active');
            currentStep++;
            setTimeout(processNextStep, 800);
        } else {
            // Show success
            setTimeout(() => {
                steps[currentStep].classList.add('success');
                document.querySelector('.payment-success').style.display = 'block';
            }, 800);
        }
    };

    // Reset and start
    steps.forEach(step => {
        step.classList.remove('active', 'success');
    });
    document.querySelector('.payment-success').style.display = 'none';

    setTimeout(processNextStep, 500);
}

function closeDemoModal() {
    document.getElementById('demoModal').style.display = 'none';
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('demoModal');
    if (event.target === modal) {
        closeDemoModal();
    }
}

// Testimonial interaction
document.querySelectorAll('.testimonial-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
        this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
    });
});

// Feature card interactions
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        const icon = this.querySelector('.feature-icon');
        if (icon) {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        }
    });

    card.addEventListener('mouseleave', function() {
        const icon = this.querySelector('.feature-icon');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
        }
    });
});

// Pricing card interactions
document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        if (!this.classList.contains('featured')) {
            this.style.borderColor = '#2563eb';
        }
    });

    card.addEventListener('mouseleave', function() {
        if (!this.classList.contains('featured')) {
            this.style.borderColor = '#e5e7eb';
        }
    });
});

// Action button interactions
document.querySelectorAll('.action-button').forEach(button => {
    button.addEventListener('click', function() {
        // Simulate action execution
        const originalText = this.textContent;
        this.textContent = 'Processing...';
        this.disabled = true;

        setTimeout(() => {
            this.textContent = '✓ Applied';
            this.style.background = '#059669';

            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
                this.style.background = '#2563eb';
            }, 2000);
        }, 1500);
    });
});

// Automation toggle interactions
document.querySelectorAll('.preview-item i').forEach(toggle => {
    toggle.addEventListener('click', function() {
        if (this.classList.contains('fa-toggle-off')) {
            this.classList.remove('fa-toggle-off');
            this.classList.add('fa-toggle-on');
            this.style.color = '#10b981';
        } else {
            this.classList.remove('fa-toggle-on');
            this.classList.add('fa-toggle-off');
            this.style.color = '#6b7280';
        }
    });
});

// Social platform hover effects
document.querySelectorAll('.platform').forEach(platform => {
    platform.addEventListener('mouseenter', function() {
        const icon = this.querySelector('i');
        if (icon.classList.contains('fa-instagram')) {
            this.style.color = '#E4405F';
        } else if (icon.classList.contains('fa-facebook')) {
            this.style.color = '#1877F2';
        } else if (icon.classList.contains('fa-linkedin')) {
            this.style.color = '#0A66C2';
        }
    });

    platform.addEventListener('mouseleave', function() {
        this.style.color = '#6b7280';
    });
});

// Insight card interactions
document.querySelectorAll('.insight-card').forEach(card => {
    card.addEventListener('click', function() {
        // Add subtle selection effect
        this.style.transform = 'scale(1.02)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
});

// Navigation scroll effect
let lastScrollY = window.scrollY;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }

    lastScrollY = window.scrollY;
});

// Form interactions
document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('focus', function() {
        this.style.borderColor = '#2563eb';
        this.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
    });

    input.addEventListener('blur', function() {
        this.style.borderColor = '#e5e7eb';
        this.style.boxShadow = 'none';
    });
});

// CTA button tracking
document.querySelectorAll('.cta-button, .pricing-button, .start-demo-button').forEach(button => {
    button.addEventListener('click', function() {
        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.marginLeft = '-10px';
        ripple.style.marginTop = '-10px';

        this.style.position = 'relative';
        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple animation CSS
const rippleStyles = `
@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = rippleStyles;
document.head.appendChild(styleSheet);

// Real-time demo updates
if (demoActive) {
    setInterval(() => {
        // Randomly update some metrics to show "live" data
        const visitors = document.querySelector('.metric-value');
        if (visitors && Math.random() > 0.95) { // 5% chance every interval
            const currentValue = parseInt(visitors.textContent.replace(/,/g, ''));
            const newValue = currentValue + Math.floor(Math.random() * 10) + 1;
            visitors.textContent = newValue.toLocaleString();

            // Flash the metric to show it updated
            visitors.style.color = '#10b981';
            setTimeout(() => {
                visitors.style.color = '#2563eb';
            }, 1000);
        }
    }, 5000);
}

// Keyboard shortcuts for demo
document.addEventListener('keydown', function(e) {
    if (demoActive) {
        switch(e.key) {
            case '1':
                showTab('overview');
                break;
            case '2':
                showTab('insights');
                break;
            case '3':
                showTab('automation');
                break;
            case '4':
                showTab('payments');
                break;
            case 'Escape':
                if (document.getElementById('demoModal').style.display === 'block') {
                    closeDemoModal();
                }
                break;
        }
    }
});

// Performance monitoring
const performanceMetrics = {
    pageLoadTime: 0,
    demoLoadTime: 0,
    chartRenderTime: 0
};

window.addEventListener('load', () => {
    performanceMetrics.pageLoadTime = performance.now();

    // Simulate analytics tracking (would integrate with real analytics)
    console.log('SmartBiz Demo Performance:', {
        pageLoad: `${performanceMetrics.pageLoadTime.toFixed(2)}ms`,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
    });
});

// Error handling for charts
window.addEventListener('error', (e) => {
    if (e.message.includes('Chart')) {
        console.warn('Chart rendering issue detected, attempting fallback...');
        // Could implement fallback chart rendering here
    }
});

// Touch device optimization
if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');

    // Optimize hover effects for touch
    document.querySelectorAll('.feature-card, .testimonial-card').forEach(card => {
        card.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });

        card.addEventListener('touchend', function() {
            setTimeout(() => {
                this.classList.remove('touch-active');
            }, 150);
        });
    });
}