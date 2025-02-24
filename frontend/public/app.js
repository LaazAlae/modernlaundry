const API_URL = '/api';
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



//event listeners for the modal close buttons
document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});