// Initialize Firebase
const db = firebase.firestore();

// Auth state management
function initAuthStateListener() {
    firebase.auth().onAuthStateChanged((user) => {
        updateNavigation(user);
        protectRoutes(user);
        if (user) loadUserData(user);
    });
}

// Update navigation based on auth state
function updateNavigation(user) {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    navLinks.innerHTML = `
        <a href="index.html" class="nav-link">Home</a>
        <a href="exercises.html" class="nav-link">Exercises</a>
        <a href="shop.html" class="nav-link">Shop</a>
        <div class="dropdown">
            <a href="#" class="nav-link">Account ▼</a>
            <div class="dropdown-content">
                ${user ? `
                    <a href="profile.html" class="nav-link">Profile</a>
                    <a href="#" class="nav-link" onclick="logout()">Logout</a>
                ` : `
                    <a href="auth.html?type=login" class="nav-link">Sign In</a>
                    <a href="auth.html?type=register" class="nav-link">Sign Up</a>
                `}
            </div>
        </div>
    `;
}

// Protect routes that require authentication
function protectRoutes(user) {
    const protectedRoutes = ['profile.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedRoutes.includes(currentPage)) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
        }
    }
}


// Auth form handling
function setupAuthForm() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || 'login';

    document.getElementById('authTitle').textContent = 
        type === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('submitBtn').textContent = 
        type === 'login' ? 'Sign In' : 'Sign Up';
    document.getElementById('authSwitch').innerHTML = 
        type === 'login' 
        ? 'Need an account? <a href="auth.html?type=register">Sign Up</a>'
        : 'Already have an account? <a href="auth.html?type=login">Sign In</a>';

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const authAction = type === 'login' 
            ? firebase.auth().signInWithEmailAndPassword(email, password)
            : firebase.auth().createUserWithEmailAndPassword(email, password);

        authAction
            .then(() => window.location.href = 'profile.html')
            .catch(error => alert(error.message));
    });
}

// Profile management
function setupProfilePage() {
    if (!document.getElementById('profileView')) return;

    showProfileView();
    
    document.getElementById('editForm')?.addEventListener('submit', updateProfile);
}

function showProfileView() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userName').textContent = user.displayName || 'Guest';
}

function showEditForm() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    document.getElementById('profileView').style.display = 'none';
    document.getElementById('profileEdit').style.display = 'block';
    document.getElementById('editName').value = user.displayName || '';
}

async function updateProfile(e) {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        // Update authentication profile
        await user.updateProfile({
            displayName: document.getElementById('editName').value
        });

        // Update Firestore user document
        await db.collection('users').doc(user.uid).set({
            age: document.getElementById('editAge').value,
            weight: document.getElementById('editWeight').value,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showProfileView();
        alert('Profile updated successfully!');
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

// Routine management
function setupIndexPage() {
    if (!document.getElementById('routineForm')) return;

    document.getElementById('routineForm')?.addEventListener('submit', saveRoutine);
}

async function saveRoutine(e) {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) return;

    const routine = {
        name: document.getElementById('routineName').value,
        focus: document.getElementById('routineFocus').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(user.uid).collection('routines').add(routine);
        alert('Routine saved successfully!');
        loadUserData(user);
        document.getElementById('routineForm').reset();
    } catch (error) {
        alert('Error saving routine: ' + error.message);
    }
}

async function loadUserData(user) {
    if (!user) return;

    try {
        // Load profile data
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (document.getElementById('userName')) {
                document.getElementById('userName').textContent = user.displayName || 'Guest';
            }
            // Update other profile fields as needed
        }

        // Load routines if on index page
        if (document.getElementById('savedRoutines')) {
            const routinesSnapshot = await db.collection('users').doc(user.uid)
                .collection('routines').orderBy('timestamp', 'desc').get();
            
            const routinesList = document.getElementById('savedRoutines');
            routinesList.innerHTML = '';
            
            routinesSnapshot.forEach(doc => {
                const data = doc.data();
                routinesList.innerHTML += `
                    <div class="routine-card">
                        <h4>${data.name}</h4>
                        <p>Type: ${data.focus}</p>
                        <small>${new Date(data.timestamp?.toDate()).toLocaleDateString()}</small>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Logout function
function logout() {
    firebase.auth().signOut()
        .then(() => window.location.href = 'index.html')
        .catch(error => alert(error.message));
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuthStateListener();
    setupAuthForm();
    setupProfilePage();
    setupIndexPage();
});
