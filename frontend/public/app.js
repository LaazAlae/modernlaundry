const API_URL = '/api';


const MACHINES = {
    'washer1': { name: 'Washer 1', defaultTime: 30 },
    'washer2': { name: 'Washer 2', defaultTime: 30 },
    'dryer1': { name: 'Dryer 1', defaultTime: 60 },
    'dryer2': { name: 'Dryer 2', defaultTime: 60 }
};

let selectedMachineId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeNotifyButton();
    initializePWAInstall();
    fetchAndUpdateMachines();
    setInterval(fetchAndUpdateMachines, 1000);
});

// PWA Installation
function initializePWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Create and show the install banner
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <p>Install Flint Laundry for easy access!</p>
            <button id="installButton" class="install-button">Install</button>
        `;
        
        document.body.appendChild(installBanner);
        
        document.getElementById('installButton').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the installation');
                }
                deferredPrompt = null;
                installBanner.remove();
            }
        });
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
    });
}

// Notification button initialization
function initializeNotifyButton() {
    const notifyBtn = document.getElementById('notifyBtn');
    const emailModal = document.getElementById('emailModal');
    const emailInput = document.getElementById('emailInput');
    const savedEmail = localStorage.getItem('userEmail');

    // Pre-fill email if exists
    if (savedEmail) {
        emailInput.value = savedEmail;
    }

    notifyBtn.addEventListener('click', () => {
        emailModal.style.display = 'flex';
        if (savedEmail) {
            emailInput.value = savedEmail;
        }
    });

    document.getElementById('saveEmailButton').addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (isValidEmail(email)) {
            localStorage.setItem('userEmail', email);
            emailModal.style.display = 'none';
            showToast('Email saved successfully!');
        } else {
            showToast('Please enter a valid email address');
        }
    });
}

// Machine timer functions
function openTimerModal(machineId) {
    const machine = MACHINES[machineId];
    if (!machine) return;

    selectedMachineId = machineId;
    const modal = document.getElementById('timerModal');
    const modalTitle = document.getElementById('modalTitle');
    const timeInput = document.getElementById('timeInput');

    modalTitle.textContent = machine.name;
    timeInput.value = machine.defaultTime;
    modal.style.display = 'flex';
    timeInput.focus();

    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('startButton').disabled = false;
}



// Utility functions
function getTimeLeft(endTime) {
    if (!endTime) return 0;
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, diff / 1000);
}

function formatTimeSince(time) {
    const date = new Date(time);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    
    // Base styles
    toast.className = `
        fixed z-50 min-w-[300px] max-w-[500px] flex items-center gap-3 
        py-4 px-6 rounded-lg shadow-lg backdrop-blur-sm 
        border border-white/10 transform transition-all duration-300
    `;
    
    // Position at the top center
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, -150%)';
    
    // Define icons and styles for each type
    const configs = {
        success: {
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                   </svg>`,
            style: 'bg-emerald-600/95 text-white ring-1 ring-emerald-600/20'
        },
        error: {
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                   </svg>`,
            style: 'bg-rose-600/95 text-white ring-1 ring-rose-600/20'
        },
        warning: {
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                   </svg>`,
            style: 'bg-amber-500/95 text-white ring-1 ring-amber-500/20'
        },
        info: {
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                   </svg>`,
            style: 'bg-sky-600/95 text-white ring-1 ring-sky-600/20'
        }
    };

    const config = configs[type] || configs.info;
    toast.className += ' ' + config.style;

    // Add content with icon
    toast.innerHTML = `
        <div class="icon-wrapper">
            ${config.icon}
        </div>
        <p class="flex-grow font-medium text-[15px]">${message}</p>
        <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 transition-opacity">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in with a bounce effect
    requestAnimationFrame(() => {
        toast.style.transform = 'translate(-50%, 0) scale(1)';
    });

    // Optional: Add hover effect to pause the timer
    let timeoutId;
    
    const startTimer = () => {
        timeoutId = setTimeout(() => {
            toast.style.transform = 'translate(-50%, -150%) scale(0.95)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    toast.addEventListener('mouseleave', startTimer);
    
    startTimer();
}

// Event listeners
document.getElementById('startButton').addEventListener('click', startMachine);

document.getElementById('timeInput').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    const errorMessage = document.getElementById('errorMessage');
    const startButton = document.getElementById('startButton');
    
    if (value < 5 || value > 90) {
        errorMessage.style.display = 'block';
        startButton.disabled = true;
    } else {
        errorMessage.style.display = 'none';
        startButton.disabled = false;
    }
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const timerModal = document.getElementById('timerModal');
    const emailModal = document.getElementById('emailModal');
    
    if (e.target === timerModal) {
        timerModal.style.display = 'none';
    }
    if (e.target === emailModal) {
        emailModal.style.display = 'none';
    }
});

// Initialize machines
async function fetchAndUpdateMachines() {
    try {
        const response = await fetch('/api/machines', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const machines = await response.json();
        const machinesContainer = document.getElementById('machines');
        machinesContainer.innerHTML = machines.map(createMachineHTML).join('');
        
        updateLastUpdated();
        
        // Add click handlers to machine cards
        document.querySelectorAll('.machine-card').forEach(card => {
            card.addEventListener('click', () => {
                const machineId = card.dataset.machineId;
                const machine = machines.find(m => m._id === machineId);
                if (machine) {
                    handleMachineClick(machine);
                }
            });
        });
    } catch (error) {
        console.error('Error fetching machines:', error);
        showToast('Failed to update machine status');
    }
}

function createMachineHTML(machine) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;
    const status = isActive ? 'in-use' : 'available';
    const statusText = isActive ? 'In Use' : 'Available';

    let timeDisplay = '';
    if (isActive) {
        const timeLeft = getTimeLeft(machine.endTime);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        timeDisplay = `<div class="text-3xl font-bold">${minutes}m <span class="text-xl text-gray-400">${seconds}s</span></div>`;
    }

    // Format the last used time
    const lastUsedTime = machine.lastEndTime ? formatTimeSince(machine.lastEndTime) : 'never';

    return `
        <div class="machine-card ${status} cursor-pointer" data-machine-id="${machine._id}">
            <div>
                <span class="status-badge ${status} mb-3">${statusText}</span>
                <h2 class="text-2xl font-bold mb-4">${machine.name}</h2>
                ${isActive ? `
                    <div class="text-gray-400 mb-4">${timeDisplay}</div>
                ` : `
                    <div class="text-gray-400">Ready to use</div>
                    <div class="text-sm text-gray-500 mt-2">Last timer ended: ${lastUsedTime}</div>
                `}
            </div>
        </div>
    `;
}


function formatTimeSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}


// Initialize all event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeNotifyButton();
    initializeTestEmailButton();
    fetchAndUpdateMachines();
    setInterval(fetchAndUpdateMachines, 1000);
});

// Initialize test email button
function initializeTestEmailButton() {
    const testEmailBtn = document.getElementById('testEmailBtn');
    testEmailBtn.addEventListener('click', async () => {
        console.log('Test email button clicked');
        const savedEmail = localStorage.getItem('userEmail');
        
        if (!savedEmail) {
            showToast('Please set your email first using the Notify Me button');
            return;
        }

        try {
            showToast('Sending test email...');
            console.log('Sending test email to:', savedEmail);
            
            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: savedEmail })
            });

            console.log('Test email response:', response);

            if (response.ok) {
                showToast('Test email sent! Please check your inbox.');
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to send test email');
            }
        } catch (error) {
            console.error('Error sending test email:', error);
            showToast('Failed to send test email');
        }
    });
}



// Handle machine click
function handleMachineClick(machine) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;

    if (isActive) {
        // Show subscribe modal for machines in use
        const modal = document.getElementById('subscribeModal');
        const title = document.getElementById('subscribeTitle');
        const emailInput = document.getElementById('subscribeEmail');
        const email = localStorage.getItem('userEmail') || '';
        
        title.textContent = `${machine.name} in use`;
        if (email) {
            emailInput.value = email;
        }
        
        document.getElementById('subscribeButton').onclick = async () => {
            const email = emailInput.value.trim();
            
            if (!isValidEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/api/machines/${machine._id}/subscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                if (response.ok) {
                    localStorage.setItem('userEmail', email);
                    modal.style.display = 'none';
                    showToast(`We'll notify you when ${machine.name} is almost ready`, 'success');
                } else {
                    const error = await response.json();
                    showToast(error.message || 'Failed to subscribe', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Failed to subscribe to notifications', 'error');
            }
        };
        
        modal.style.display = 'flex';
    } else {
        // Show timer modal for available machines
        openTimerModal(machine._id);
    }
}

// Start machine function
async function startMachine() {
    const timeInput = document.getElementById('timeInput');
    const duration = parseInt(timeInput.value);
    const email = localStorage.getItem('userEmail');

    if (duration < 5 || duration > 90) {
        showToast('Please enter a time between 5 and 90 minutes', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/machines/${selectedMachineId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                duration,
                email 
            })
        });

        if (response.ok) {
            document.getElementById('timerModal').style.display = 'none';
            if (email) {
                showToast('Started! You\'ll be notified 5 minutes before completion', 'success');
            } else {
                showToast('Machine started successfully', 'success');
            }
            fetchAndUpdateMachines();
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to start machine', 'error');
        }
    } catch (error) {
        console.error('Error starting machine:', error);
        showToast('Failed to start machine. Please try again.', 'error');
    }
}

// Test email button
document.getElementById('testEmailBtn').addEventListener('click', async () => {
    const savedEmail = localStorage.getItem('userEmail');
    
    if (!savedEmail) {
        showToast('Please set your email first using the Notify Me button', 'warning');
        return;
    }

    try {
        showToast('Sending test email...', 'info');
        const response = await fetch('/api/test-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: savedEmail })
        });

        if (response.ok) {
            showToast('Test email sent! Please check your inbox', 'success');
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to send test email', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to send test email', 'error');
    }
});

// Add event listeners for closing modals
window.addEventListener('click', (event) => {
    const subscribeModal = document.getElementById('subscribeModal');
    const timerModal = document.getElementById('timerModal');
    const emailModal = document.getElementById('emailModal');
    
    if (event.target === subscribeModal) {
        subscribeModal.style.display = 'none';
    }
    if (event.target === timerModal) {
        timerModal.style.display = 'none';
    }
    if (event.target === emailModal) {
        emailModal.style.display = 'none';
    }
});
async function openTimerModal(machineId) {
    try {
        console.log('Opening modal for machine:', machineId);
        const response = await fetch(`${API_URL}/machines/${machineId}`);
        const machine = await response.json();
        
        if (!machine) {
            console.error('Machine not found');
            return;
        }

        selectedMachineId = machineId;
        const modal = document.getElementById('timerModal');
        const modalTitle = document.getElementById('modalTitle');
        const timeInput = document.getElementById('timeInput');

        modalTitle.textContent = machine.name;
        timeInput.value = machine.defaultTime || 30;
        modal.style.display = 'flex';
        timeInput.focus();

        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('startButton').disabled = false;
    } catch (error) {
        console.error('Error opening modal:', error);
        showToast('Error opening timer modal');
    }
}


function updateLastUpdated() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('footerText').textContent = `updated: ${time} | `;
}




// Add this to your public/app.js file

// Track installation status
let deferredPrompt;
const installButton = document.createElement('div');

function createInstallPrompt() {
    installButton.className = 'install-prompt';
    installButton.innerHTML = `
        <div class="install-container">
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div class="install-text">
                    <h3>Add to Home Screen</h3>
                    <p>Install this app on your device for quick access anytime!</p>
                </div>
                <button class="install-button">Install Now</button>
                <button class="dismiss-button">Maybe Later</button>
            </div>
        </div>
    `;
    document.body.appendChild(installButton);
    
    // Handle install button click
    installButton.querySelector('.install-button').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
        hideInstallPrompt();
        localStorage.setItem('installPromptDismissed', 'true');
    });
    
    // Handle dismiss button click
    installButton.querySelector('.dismiss-button').addEventListener('click', () => {
        hideInstallPrompt();
        // Remember the user dismissed it for 3 days
        const now = new Date();
        const expiry = now.getTime() + (3 * 24 * 60 * 60 * 1000); // 3 days
        localStorage.setItem('installPromptDismissed', expiry);
    });
}

function showInstallPrompt() {
    if (installButton.parentElement !== document.body) {
        document.body.appendChild(installButton);
    }
    // Slight delay to show the prompt for better user experience
    setTimeout(() => {
        installButton.style.display = 'block';
    }, 2000);
}

function hideInstallPrompt() {
    installButton.style.display = 'none';
}

function checkIfShouldShowPrompt() {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed === 'true') {
        return false;
    } else if (dismissed) {
        // Check if the dismissal has expired
        const now = new Date().getTime();
        if (parseInt(dismissed) > now) {
            return false;
        }
    }
    return true;
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (checkIfShouldShowPrompt()) {
        createInstallPrompt();
        showInstallPrompt();
    }
});

// If already installed, log it
window.addEventListener('appinstalled', () => {
    console.log('App was installed');
    hideInstallPrompt();
    localStorage.setItem('appInstalled', 'true');
});

// Check if we should show manual instructions
window.addEventListener('DOMContentLoaded', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Show iOS-specific instructions
    if (isIOS && isSafari && !isStandalone && checkIfShouldShowPrompt()) {
        showIOSInstructions();
    }
});

function showIOSInstructions() {
    const iosPrompt = document.createElement('div');
    iosPrompt.className = 'ios-install-prompt';
    iosPrompt.innerHTML = `
        <div class="install-container">
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div class="install-text">
                    <h3>Install on iOS</h3>
                    <p>1. Tap the share button <span class="share-icon">⎙</span> below</p>
                    <p>2. Scroll down and tap "Add to Home Screen"</p>
                </div>
                <button class="dismiss-button">Got it</button>
            </div>
        </div>
    `;
    document.body.appendChild(iosPrompt);
    
    iosPrompt.querySelector('.dismiss-button').addEventListener('click', () => {
        iosPrompt.style.display = 'none';
        localStorage.setItem('installPromptDismissed', 'true');
    });
}



// Create and manage the fixed position install button
function createFixedInstallButton() {
    // Create the HTML structure
    const fixedInstallContainer = document.createElement('div');
    fixedInstallContainer.className = 'fixed-install-container';
    fixedInstallContainer.innerHTML = `
      <div class="fixed-install-icon pulse">📱</div>
      <div class="fixed-install-text">Add to Home Screen</div>
      <div class="fixed-install-close">✕</div>
    `;
    
    document.body.appendChild(fixedInstallContainer);
    
    // Add interaction logic
    const closeButton = fixedInstallContainer.querySelector('.fixed-install-close');
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the container click
      fixedInstallContainer.style.display = 'none';
      
      // Remember for 7 days
      const now = new Date();
      const expiry = now.getTime() + (7 * 24 * 60 * 60 * 1000); // 7 days
      localStorage.setItem('installButtonDismissed', expiry);
    });
    
    // Show full button after 3 seconds
    setTimeout(() => {
      fixedInstallContainer.classList.add('visible');
      
      // Stop pulsing after it's fully visible
      setTimeout(() => {
        const icon = fixedInstallContainer.querySelector('.fixed-install-icon');
        icon.classList.remove('pulse');
      }, 3000);
    }, 3000);
    
    // Handle install action
    fixedInstallContainer.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Show browser install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
          fixedInstallContainer.style.display = 'none';
        }
        
        deferredPrompt = null;
      } else {
        // For iOS or other browsers that don't support beforeinstallprompt
        showManualInstallInstructions();
      }
    });
    
    return fixedInstallContainer;
  }
  
  // Check if we should show the button
  function shouldShowInstallButton() {
    // Don't show if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return false;
    }
    
    // Check if user dismissed it recently
    const dismissed = localStorage.getItem('installButtonDismissed');
    if (dismissed) {
      const now = new Date().getTime();
      if (parseInt(dismissed) > now) {
        return false;
      }
    }
    
    return true;
  }
  
  // Show manual install instructions for iOS and other browsers
  function showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // iOS-specific instructions
      alert('To install this app:\n\n1. Tap the share button ⎙ at the bottom of the screen\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right corner');
    } else {
      // Generic instructions for other browsers
      alert('To install this app:\n\n1. Open your browser menu (usually three dots in the top right)\n2. Look for "Add to Home Screen" or "Install App" option\n3. Follow the on-screen instructions');
    }
  }
  
  // Track installation availability
  let fixedInstallButton;
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (shouldShowInstallButton() && !fixedInstallButton) {
      fixedInstallButton = createFixedInstallButton();
    }
  });
  
  // If app is installed, track it
  window.addEventListener('appinstalled', () => {
    console.log('App was installed');
    localStorage.setItem('appInstalled', 'true');
    
    // Hide the install button if it exists
    if (fixedInstallButton) {
      fixedInstallButton.style.display = 'none';
    }
  });
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', () => {
    // Check if we should show the button for browsers that don't fire beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!isStandalone && shouldShowInstallButton() && (isIOS || !deferredPrompt)) {
      fixedInstallButton = createFixedInstallButton();
    }
  });