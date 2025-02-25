function resetInstallationFlags() {
    // Clear any installation flags in localStorage
    localStorage.removeItem('installPromptDismissed');
    localStorage.removeItem('installPromptDismissedPermanently');
    
    // Force reload to recheck installation eligibility
    window.location.reload();
  }


  function forceShowIOSInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // If it's iOS and a mobile device
    if (isIOS && isMobile) {
      const modal = document.createElement('div');
      modal.id = 'installModal';
      modal.className = 'modal';
      modal.style.display = 'flex';
      
      modal.innerHTML = `
        <div class="modal-content">
          <button class="modal-close absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
          <h2 class="text-2xl font-bold mb-4">Install This App</h2>
          <p class="mb-4 text-gray-300">Add Flint Laundry to your home screen for quick access.</p>
          <div class="bg-black rounded-lg p-4 mb-6">
            <p class="text-gray-300 mb-2">1. Tap the share icon</p>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-blue-400">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <p class="text-gray-300 mb-2 mt-2">2. Scroll and tap "Add to Home Screen"</p>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-green-400">
              <path d="M12 5v14"></path>
              <path d="M5 12h14"></path>
            </svg>
          </div>
          <div class="modal-buttons">
            <button id="dismissInstallButton" 
                  class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      document.getElementById('dismissInstallButton').addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
  }



function createMachineHTML(machine, savedState) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;
    const status = isActive ? 'in-use' : 'available';
    const statusText = isActive ? 'In Use' : 'Available';

    // Check if current user is subscribed for notifications
    const savedEmail = localStorage.getItem('userEmail');
    
    // Check if user started this machine (is the current user)
    const isCurrentUser = savedEmail && 
                         machine.currentUserEmail === savedEmail;
    
    // Check if user is subscribed for notifications
    let isSubscribed = savedEmail && 
                      machine.notifyUsers && 
                      machine.notifyUsers.some(user => user.email === savedEmail);
    
    // If we have saved state from a user toggle, respect that instead of the server state
    if (savedState && savedState.userUnsubscribed) {
        isSubscribed = !savedState.userUnsubscribed;
    }
    
    // Bell icon classes - green if subscribed, gray with cross if not
    const bellClass = isSubscribed ? 'subscribed' : 'not-subscribed';
    
    // Bell icon SVG (will be green if subscribed, gray with cross if not)
    const bellIcon = `
        <div class="notification-bell ${bellClass}" data-machine-id="${machine._id}">
            ${isSubscribed ? 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>` : 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>`}
        </div>
    `;

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
        <div class="machine-card ${status}" data-machine-id="${machine._id}" ${isSubscribed ? 'data-user-unsubscribed="false"' : 'data-user-unsubscribed="true"'}>
            <div class="flex justify-between items-start w-full">
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
                ${bellIcon}
            </div>
        </div>
    `;
}const API_URL = '/api';
let deferredPrompt;

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

    // Add event listeners for the modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Add installation reset buttons to footer
    const footer = document.querySelector('footer');
    if (footer) {
        // Reset installation button
        const resetButton = document.createElement('button');
        resetButton.id = 'resetInstallButton';
        resetButton.className = 'text-xs text-gray-500 ml-2';
        resetButton.textContent = 'Reset Install';
        resetButton.addEventListener('click', resetInstallationFlags);
        footer.appendChild(resetButton);
        
        // Show iOS installation instructions button
        const showInstallButton = document.createElement('button');
        showInstallButton.id = 'showInstallButton';
        showInstallButton.className = 'text-xs text-gray-500 ml-2';
        showInstallButton.textContent = 'Show Install';
        showInstallButton.addEventListener('click', forceShowIOSInstructions);
        footer.appendChild(showInstallButton);
    }
});

// Toast notification function (was missing)
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

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

// Settings button initialization (formerly Notify button)
function initializeNotifyButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    const emailModal = document.getElementById('emailModal');
    const emailInput = document.getElementById('emailInput');
    
    if (!settingsBtn) {
        console.error('Settings button not found');
        return;
    }
    
    const savedEmail = localStorage.getItem('userEmail');

    // Pre-fill email if exists
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
    }

    settingsBtn.addEventListener('click', () => {
        if (emailModal) {
            emailModal.style.display = 'flex';
            if (savedEmail && emailInput) {
                emailInput.value = savedEmail;
            }
        }
    });

    const saveEmailButton = document.getElementById('saveEmailButton');
    if (saveEmailButton) {
        saveEmailButton.addEventListener('click', () => {
            if (!emailInput) return;
            
            const email = emailInput.value.trim();
            if (isValidEmail(email)) {
                localStorage.setItem('userEmail', email);
                emailModal.style.display = 'none';
                showToast('Email saved successfully!');
            } else {
                showToast('Please enter a valid email address', 'error');
            }
        });
    }
}

// Machine timer functions
function openTimerModal(machineId) {
    const response = fetch(`${API_URL}/machines/${machineId}`)
        .then(response => response.json())
        .then(machine => {
            if (!machine) {
                console.error('Machine not found');
                return;
            }

            selectedMachineId = machineId;
            const modal = document.getElementById('timerModal');
            const modalTitle = document.getElementById('modalTitle');
            const timeInput = document.getElementById('timeInput');

            if (!modal || !modalTitle || !timeInput) {
                console.error('Modal elements not found');
                return;
            }

            modalTitle.textContent = machine.name;
            timeInput.value = machine.defaultTime || 30;
            
            // Check if user has email set
            const savedEmail = localStorage.getItem('userEmail');
            
            // Show email request if no email saved
            if (!savedEmail) {
                const emailRequestDiv = document.getElementById('emailRequestSection');
                if (emailRequestDiv) {
                    emailRequestDiv.style.display = 'block';
                }
            } else {
                const emailRequestDiv = document.getElementById('emailRequestSection');
                if (emailRequestDiv) {
                    emailRequestDiv.style.display = 'none';
                }
            }
            
            modal.style.display = 'flex';
            timeInput.focus();

            const errorMessage = document.getElementById('errorMessage');
            const startButton = document.getElementById('startButton');
            
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            if (startButton) {
                startButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error opening timer modal:', error);
            showToast('Error opening timer modal', 'error');
        });
}

// Start machine function
async function startMachine() {
    const timeInput = document.getElementById('timeInput');
    const timerEmailInput = document.getElementById('timerEmailInput');
    
    if (!timeInput) {
        showToast('Error: Time input not found', 'error');
        return;
    }
    
    const duration = parseInt(timeInput.value);
    
    // Get email - either from localStorage or from the timer modal input
    let email = localStorage.getItem('userEmail');
    let newEmailSubmitted = false;
    
    // If user just entered email in the timer modal
    if (timerEmailInput && timerEmailInput.value.trim() !== '' && isValidEmail(timerEmailInput.value.trim())) {
        email = timerEmailInput.value.trim();
        localStorage.setItem('userEmail', email);
        newEmailSubmitted = true;
    }

    if (duration < 5 || duration > 90) {
        showToast('Please enter a time between 5 and 90 minutes', 'warning');
        return;
    }

    try {
        // Start the machine
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

        const timerModal = document.getElementById('timerModal');
        if (timerModal) {
            timerModal.style.display = 'none';
        }
        
        if (response.ok) {
            // Successfully started the machine
            if (email) {
                // The backend already subscribes the starter by default
                // But we could add an explicit subscription call here if needed
                showToast('Started! You\'ll be notified 5 minutes before completion', 'success');
            } else {
                showToast('Machine started successfully', 'success');
            }
            
            // Update UI to show latest machine states including bell icons
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

// Handle machine click
function handleMachineClick(machine) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;

    if (isActive) {
        // When clicking on an active machine, we show details or simply provide info
        const savedEmail = localStorage.getItem('userEmail');
        const isSubscribed = savedEmail && 
                            machine.notifyUsers && 
                            machine.notifyUsers.some(user => user.email === savedEmail);
        
        if (isSubscribed) {
            showToast(`${machine.name} will be available in approximately ${Math.floor(getTimeLeft(machine.endTime) / 60)} minutes`, 'info');
        } else {
            // If not subscribed, prompt them to click the bell if they want notifications
            showToast(`Click the bell icon if you want to be notified when ${machine.name} is ready`, 'info');
        }
    } else {
        // Show timer modal for available machines
        openTimerModal(machine._id);
    }
}

// Subscribe to machine notifications
async function subscribeToMachine(machineId, email) {
    try {
        showToast(`You'll be notified when this machine is almost ready`, 'success');
        
        // Find the bell element and update it visually immediately for better UX
        const bell = document.querySelector(`.notification-bell[data-machine-id="${machineId}"]`);
        if (bell) {
            bell.classList.remove('not-subscribed');
            bell.classList.add('subscribed');
            bell.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            `;
        }
        
        // Update machine data in memory to track subscription without API call
        // Find the machine in the most recent fetch
        const machineElement = document.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
        if (machineElement) {
            // Mark as subscribed in the DOM directly
            machineElement.setAttribute('data-subscribed', 'true');
        }
        
        // Call the backend to save the subscription
        try {
            const response = await fetch(`/api/machines/${machineId}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
        } catch (apiError) {
            console.error('API error during subscribe:', apiError);
            // We won't revert the UI even if API fails to maintain user's intended action
        }
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to subscribe to notifications', 'error');
    }
}

// Unsubscribe from machine notifications (turn bell off)
async function unsubscribeFromMachine(machineId, email) {
    try {
        showToast(`Notifications turned off for this machine`, 'info');
        
        // Find the bell element and update it visually immediately for better UX
        const bell = document.querySelector(`.notification-bell[data-machine-id="${machineId}"]`);
        if (bell) {
            bell.classList.remove('subscribed');
            bell.classList.add('not-subscribed');
            bell.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        }
        
        // Update machine data in memory to track unsubscription without API call
        // Find the machine in the most recent fetch
        const machineElement = document.querySelector(`.machine-card[data-machine-id="${machineId}"]`);
        if (machineElement) {
            // Mark as unsubscribed in the DOM directly
            machineElement.setAttribute('data-subscribed', 'false');
        }
        
        // In a real implementation, you would call an API endpoint
        try {
            const response = await fetch(`/api/machines/${machineId}/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
        } catch (apiError) {
            console.error('API error during unsubscribe:', apiError);
            // We won't revert the UI even if API fails to maintain user's intended action
        }
        
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
}

// Toggle notification subscription
function toggleNotification(e, machineId) {
    e.stopPropagation(); // Prevent triggering the machine card click
    
    // Get the bell element
    const bell = e.currentTarget;
    const isCurrentlySubscribed = bell.classList.contains('subscribed');
    const savedEmail = localStorage.getItem('userEmail');
    
    // Store the current toggle state in a data attribute to prevent auto-refresh from resetting it
    const machineCard = bell.closest('.machine-card');
    if (machineCard) {
        if (isCurrentlySubscribed) {
            machineCard.setAttribute('data-user-unsubscribed', 'true');
        } else {
            machineCard.setAttribute('data-user-unsubscribed', 'false');
        }
    }
    
    // If already subscribed, unsubscribe immediately for responsive UI
    if (isCurrentlySubscribed && savedEmail) {
        // Immediate visual feedback - change the bell
        bell.classList.remove('subscribed');
        bell.classList.add('not-subscribed');
        bell.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
        
        // Then call the backend
        unsubscribeFromMachine(machineId, savedEmail);
        return;
    }
    
    // If not subscribed and has email, subscribe immediately for responsive UI
    if (!isCurrentlySubscribed && savedEmail) {
        // Get the machine to check if it's active
        fetch(`/api/machines/${machineId}`)
            .then(response => response.json())
            .then(machine => {
                const isActive = machine.inUse && 
                               machine.endTime && 
                               new Date(machine.endTime) > new Date();
                
                if (isActive) {
                    // Check if machine has more than 5 minutes left
                    const timeLeft = getTimeLeft(machine.endTime);
                    if (timeLeft > 300) { // 300 seconds = 5 minutes
                        // Immediate visual feedback - change the bell
                        bell.classList.remove('not-subscribed');
                        bell.classList.add('subscribed');
                        bell.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        `;
                        
                        // Then call the backend
                        subscribeToMachine(machineId, savedEmail);
                    } else {
                        showToast('Machine has less than 5 minutes remaining', 'warning');
                    }
                } else {
                    showToast('This machine is not currently in use', 'info');
                }
            })
            .catch(error => {
                console.error('Error fetching machine:', error);
                showToast('Error checking machine status', 'error');
            });
        return;
    }
    
    // User has no email saved
    if (!savedEmail) {
        // Show email modal to get their email first
        const emailModal = document.getElementById('emailModal');
        selectedMachineId = machineId;
        
        if (emailModal) {
            // Update UI to indicate this is for notification
            const modalTitle = document.getElementById('emailModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'Get Notified';
            }
            
            const modalDesc = document.getElementById('emailModalDesc');
            if (modalDesc) {
                modalDesc.textContent = `You'll only need to do this once to be notified when machines are ready.`;
            }
            
            emailModal.style.display = 'flex';
            
            // Update save button action
            const saveEmailButton = document.getElementById('saveEmailButton');
            if (saveEmailButton) {
                // Remove existing listeners
                const newButton = saveEmailButton.cloneNode(true);
                saveEmailButton.parentNode.replaceChild(newButton, saveEmailButton);
                
                // Add new listener for subscription
                newButton.addEventListener('click', async () => {
                    const emailInput = document.getElementById('emailInput');
                    if (!emailInput) return;
                    
                    const email = emailInput.value.trim();
                    if (isValidEmail(email)) {
                        localStorage.setItem('userEmail', email);
                        emailModal.style.display = 'none';
                        
                        // Check if machine is active before subscribing
                        fetch(`/api/machines/${machineId}`)
                            .then(response => response.json())
                            .then(machine => {
                                const isActive = machine.inUse && 
                                               machine.endTime && 
                                               new Date(machine.endTime) > new Date();
                                
                                if (isActive) {
                                    // Check if machine has more than 5 minutes left
                                    const timeLeft = getTimeLeft(machine.endTime);
                                    if (timeLeft > 300) { // 300 seconds = 5 minutes
                                        // Subscribe and update UI
                                        subscribeToMachine(machineId, email);
                                    } else {
                                        showToast('Machine has less than 5 minutes remaining', 'warning');
                                    }
                                } else {
                                    showToast('This machine is not currently in use', 'info');
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching machine:', error);
                                showToast('Error checking machine status', 'error');
                            });
                    } else {
                        showToast('Please enter a valid email address', 'error');
                    }
                });
            }
        }
    }
}

// Utility functions
function getTimeLeft(endTime) {
    if (!endTime) return 0;
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, diff / 1000);
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

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function updateLastUpdated() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const footerText = document.getElementById('footerText');
    if (footerText) {
        footerText.textContent = `updated: ${time}`;
    }
}

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
        
        // Store the current machine cards' toggle states before updating the DOM
        const currentMachineStates = {};
        document.querySelectorAll('.machine-card').forEach(card => {
            const machineId = card.dataset.machineId;
            const userUnsubscribed = card.getAttribute('data-user-unsubscribed') === 'true';
            const bellElement = card.querySelector('.notification-bell');
            
            if (machineId) {
                currentMachineStates[machineId] = {
                    userUnsubscribed: userUnsubscribed,
                    wasSubscribed: bellElement && bellElement.classList.contains('subscribed')
                };
            }
        });
        
        const machines = await response.json();
        const machinesContainer = document.getElementById('machines');
        
        if (!machinesContainer) {
            console.error('Machines container not found');
            return;
        }
        
        machinesContainer.innerHTML = machines.map(machine => createMachineHTML(machine, currentMachineStates[machine._id])).join('');
        
        updateLastUpdated();
        
        // Add click handlers to machine cards
        document.querySelectorAll('.machine-card').forEach(card => {
            // Restore the toggle state from before the update
            const machineId = card.dataset.machineId;
            if (machineId && currentMachineStates[machineId]) {
                if (currentMachineStates[machineId].userUnsubscribed) {
                    card.setAttribute('data-user-unsubscribed', 'true');
                    
                    // Update the bell appearance to match the saved state
                    const bellElement = card.querySelector('.notification-bell');
                    if (bellElement && currentMachineStates[machineId].wasSubscribed === false) {
                        bellElement.classList.remove('subscribed');
                        bellElement.classList.add('not-subscribed');
                        bellElement.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        `;
                    }
                }
            }
            
            card.addEventListener('click', () => {
                const machineId = card.dataset.machineId;
                const machine = machines.find(m => m._id === machineId);
                if (machine) {
                    handleMachineClick(machine);
                }
            });
        });
        
        // Add click handlers to notification bells
        document.querySelectorAll('.notification-bell').forEach(bell => {
            bell.addEventListener('click', (e) => {
                const machineId = bell.dataset.machineId;
                toggleNotification(e, machineId);
            });
        });
    } catch (error) {
        console.error('Error fetching machines:', error);
        showToast('Failed to update machine status', 'error');
    }
}

function createMachineHTML(machine) {
    const now = new Date();
    const endTime = machine.endTime ? new Date(machine.endTime) : null;
    const isActive = machine.inUse && endTime && endTime > now;
    const status = isActive ? 'in-use' : 'available';
    const statusText = isActive ? 'In Use' : 'Available';

    // Check if current user is subscribed for notifications
    const savedEmail = localStorage.getItem('userEmail');
    
    // Check if user started this machine (is the current user)
    const isCurrentUser = savedEmail && 
                         machine.currentUserEmail === savedEmail;
    
    // Check if user is subscribed for notifications
    const isSubscribed = savedEmail && 
                        machine.notifyUsers && 
                        machine.notifyUsers.some(user => user.email === savedEmail);
    
    // Bell icon classes - green if subscribed, gray with cross if not
    const bellClass = isSubscribed ? 'subscribed' : 'not-subscribed';
    
    // Bell icon SVG (will be green if subscribed, gray with cross if not)
    const bellIcon = `
        <div class="notification-bell ${bellClass}" data-machine-id="${machine._id}">
            ${isSubscribed ? 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>` : 
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>`}
        </div>
    `;

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
        <div class="machine-card ${status}" data-machine-id="${machine._id}">
            <div class="flex justify-between items-start w-full">
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
                ${bellIcon}
            </div>
        </div>
    `;
}

// Event Listener Setup
document.addEventListener('DOMContentLoaded', () => {
    // Timer modal input validation
    const timeInput = document.getElementById('timeInput');
    if (timeInput) {
        timeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const errorMessage = document.getElementById('errorMessage');
            const startButton = document.getElementById('startButton');
            
            if (errorMessage && startButton) {
                if (value < 5 || value > 90) {
                    errorMessage.style.display = 'block';
                    startButton.disabled = true;
                } else {
                    errorMessage.style.display = 'none';
                    startButton.disabled = false;
                }
            }
        });
    }
    
    // Start button in timer modal
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startMachine);
    }
    
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
    
    // Add toast container to body
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
});

// PWA Installation Prompt
document.addEventListener('DOMContentLoaded', () => {
    // Only show the prompt if we're not already in standalone mode
    // and if the user hasn't dismissed it before
    if (!window.matchMedia('(display-mode: standalone)').matches && 
        !localStorage.getItem('installPromptDismissed')) {
        
        // Check if it's a mobile device
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Detect iOS (Safari)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            // Create the modal element
            const modal = document.createElement('div');
            modal.id = 'installModal';
            modal.className = 'modal';
            modal.style.display = 'flex';
            
            // Different content based on platform
            if (isIOS) {
                modal.innerHTML = `
                    <div class="modal-content">
                        <button class="modal-close absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
                        <h2 class="text-2xl font-bold mb-4">Install This App</h2>
                        <p class="mb-4 text-gray-300">Add Flint Laundry to your home screen for quick access.</p>
                        <div class="bg-black rounded-lg p-4 mb-6">
                            <p class="text-gray-300 mb-2">1. Tap the share icon</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-blue-400">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                            <p class="text-gray-300 mb-2 mt-2">2. Scroll and tap "Add to Home Screen"</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-green-400">
                                <path d="M12 5v14"></path>
                                <path d="M5 12h14"></path>
                            </svg>
                        </div>
                        <div class="modal-buttons">
                            <button id="dismissInstallButton" 
                                    class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
                                Dismiss
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Android or other devices
                modal.innerHTML = `
                    <div class="modal-content">
                        <button class="modal-close absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
                        <h2 class="text-2xl font-bold mb-4">Install This App</h2>
                        <p class="mb-4 text-gray-300">Add Flint Laundry to your home screen for quick access:</p>
                        
                        <div id="androidInstructions" class="bg-black rounded-lg p-4 mb-6">
                            <p class="text-gray-300 mb-2">1. Tap the menu icon</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-blue-400">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                            <p class="text-gray-300 mb-2 mt-2">2. Select "Install app" or "Add to Home screen"</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block text-green-400">
                                <path d="M12 5v14"></path>
                                <path d="M5 12h14"></path>
                            </svg>
                        </div>
                        
                        <div class="modal-buttons">
                            <button id="installPWAButton" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors mb-2">
                                Install Now
                            </button>
                            <button id="dismissInstallButton" 
                                    class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
                                Dismiss
                            </button>
                        </div>
                    </div>
                `;
            }
            
            document.body.appendChild(modal);
            
            // Close button functionality
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
                localStorage.setItem('installPromptDismissed', 'true');
            });
            
            // Dismiss button functionality
            document.getElementById('dismissInstallButton').addEventListener('click', () => {
                modal.style.display = 'none';
                localStorage.setItem('installPromptDismissed', 'true');
            });
            
            // Install button for Android (uses the beforeinstallprompt event)
            const installButton = document.getElementById('installPWAButton');
            if (installButton && window.deferredPrompt) {
                installButton.addEventListener('click', async () => {
                    if (window.deferredPrompt) {
                        window.deferredPrompt.prompt();
                        const { outcome } = await window.deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            console.log('User accepted the installation');
                            modal.style.display = 'none';
                        }
                        window.deferredPrompt = null;
                    } else {
                        // Show manual instructions if the install prompt isn't available
                        document.getElementById('androidInstructions').style.display = 'block';
                    }
                });
            } else if (installButton) {
                // If no deferred prompt is available, hide the install button
                installButton.style.display = 'none';
            }
            
            // Close modal when clicking outside of it
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    localStorage.setItem('installPromptDismissed', 'true');
                }
            });
        }
    }
});