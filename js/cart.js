import { db, collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "./firebase-config.js";
import { auth } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // Explicit import

// DOM Elements - Using IDs from both versions
const cartItemsContainer = document.getElementById("cart-items") || document.getElementById("cart-items-container") || document.createElement("div");
const emptyCartMessage = document.getElementById("empty-cart-message") || document.createElement("p");
const subtotalElement = document.getElementById("subtotal") || document.querySelector(".subtotal");
const checkoutButton = document.getElementById("checkout") || document.getElementById("checkout-button") || document.querySelector(".checkout-button");

// Global variables
let cartItems = [];
let productDetails = {};
let subtotal = 0;

// Initialize cart page
document.addEventListener("DOMContentLoaded", () => {
    console.log("🛒 Initializing cart page...");
    
    // Explicitly check if elements exist in DOM and add them if they don't
    if (!cartItemsContainer.parentNode) {
        const main = document.querySelector("main") || document.body;
        main.appendChild(cartItemsContainer);
        cartItemsContainer.id = "cart-items";
    }
    
    if (!emptyCartMessage.parentNode) {
        cartItemsContainer.parentNode.insertBefore(emptyCartMessage, cartItemsContainer);
        emptyCartMessage.id = "empty-cart-message";
    }
    
    // Setup checkout button event listener
    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            console.log("Checkout button clicked, subtotal:", subtotal);
            if (subtotal > 0) {
                window.location.href = "checkout.html";
            } else {
                alert("Your cart is empty. Add items before checkout.");
            }
        });
    } else {
        console.error("❌ Checkout button not found in DOM");
    }
    
    // Check if user is logged in (moved here to ensure DOM is ready)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ User detected. Loading cart...");
            await fetchCartItems(user.uid, user.email);
        } else {
            console.log("⚠️ User not logged in");
            displayEmptyCart("Please log in to view your cart");
        }
    });
});

// Fetch cart items from Firestore - Modified to accept email and use both query methods
async function fetchCartItems(userId, userEmail) {
    try {
        console.log(`🔄 Fetching cart items for user: ${userId} (${userEmail})`);
        
        // Get all cart items then filter (fallback method from second code)
        const querySnapshot = await getDocs(collection(db, "cart"));
        
        // Clear previous items
        cartItems = [];
        
        // Process cart items - checking both userId and userEmail fields
        querySnapshot.forEach((docSnapshot) => {
            const item = docSnapshot.data();
            
            // Check if item belongs to current user (using both methods)
            if ((item.userId && item.userId === userId) || 
                (item.userEmail && item.userEmail === userEmail)) {
                
                cartItems.push({
                    id: docSnapshot.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    timestamp: item.timestamp || new Date().toISOString(),
                    userEmail: item.userEmail,
                    userId: item.userId
                });
            }
        });
        
        console.log(`📦 Found ${cartItems.length} cart items`);
        
        // If cart is empty
        if (cartItems.length === 0) {
            displayEmptyCart();
            return;
        }
        
        // Fetch product details for each cart item
        await fetchProductDetails();
        
        // Render cart items
        renderCartItems();
        
    } catch (error) {
        console.error("❌ Error fetching cart items:", error);
        displayEmptyCart("Error loading cart items. Please try again later.");
    }
}

// Fetch product details for all cart items
async function fetchProductDetails() {
    try {
        console.log("🔄 Fetching product details for cart items...");
        productDetails = {}; // Reset product details
        
        const productPromises = cartItems.map(async (item) => {
            const productDoc = await getDoc(doc(db, "products", item.productId));
            
            if (productDoc.exists()) {
                const productData = productDoc.data();
                
                // Skip products that are not visible - but only if stock_status field exists
                if (productData.stock_status && productData.stock_status !== "visible") {
                    console.warn(`🚫 Skipping hidden/unavailable product: ${item.productId}`);
                    return false;
                }
                
                productDetails[item.productId] = productData;
                return true;
            } else {
                console.warn(`⚠️ Product not found: ${item.productId}`);
                return false;
            }
        });
        
        await Promise.all(productPromises);
        
        // Filter out cart items whose products are not available or visible
        const initialCount = cartItems.length;
        cartItems = cartItems.filter(item => productDetails[item.productId]);
        console.log(`👁 Filtered out ${initialCount - cartItems.length} unavailable products`);
        
    } catch (error) {
        console.error("❌ Error fetching product details:", error);
    }
}

// Render cart items in the DOM
function renderCartItems() {
    // Clear previous content
    cartItemsContainer.innerHTML = "";
    if (emptyCartMessage) {
        emptyCartMessage.style.display = "none";
    }
    
    // Reset subtotal
    subtotal = 0;
    
    // If cart is empty after filtering invisible products
    if (cartItems.length === 0) {
        displayEmptyCart();
        return;
    }
    
    console.log("🎨 Rendering cart with items:", cartItems.length);
    
    // Create cart items HTML
    cartItems.forEach((item) => {
        const product = productDetails[item.productId];
        
        // Skip if product details are not available
        if (!product) return;
        
        // Calculate item total
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        
        // Create cart item element
        const cartItemElement = document.createElement("div");
        cartItemElement.className = "cart-item";
        cartItemElement.setAttribute("data-cart-id", item.id);
        cartItemElement.setAttribute("data-product-id", item.productId);
        
        // Use second code's HTML structure as it's simpler
        cartItemElement.innerHTML = `
            <img src="${validateImageUrl(product.img_url) ? product.img_url : "images/default.jpg"}" 
                 alt="${product.name}" 
                 onerror="this.onerror=null; this.src='images/default.jpg';"
                 class="cart-item-img">
            <div class="cart-item-details">
                <p><strong>${product.name}</strong></p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" data-cart-id="${item.id}">-</button>
                    <span class="quantity" id="cart-quantity-${item.id}">${item.quantity}</span>
                    <button class="quantity-btn plus" data-cart-id="${item.id}">+</button>
                </div>
                <p>Price: ₹${itemTotal.toFixed(2)}</p>
                <button data-id="${item.id}" class="remove-from-cart">Remove</button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    console.log("💰 Cart subtotal calculated:", subtotal);
    
    // Update subtotal display
    updateSubtotal();
    
    // Attach event listeners
    attachCartEvents();
}

// Display empty cart message
function displayEmptyCart(message = "Your cart is empty.") {
    console.log("🛒 Displaying empty cart message:", message);
    
    if (emptyCartMessage) {
        emptyCartMessage.textContent = message;
        emptyCartMessage.style.display = "block";
    }
    
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `<p>${message}</p>`;
    }
    
    updateSubtotal(0);
    
    // Disable checkout button
    if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.classList.add("disabled");
    }
}

// Update subtotal display
function updateSubtotal(value = subtotal) {
    subtotal = value;
    
    if (subtotalElement) {
        subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
        console.log("💵 Updated subtotal display:", subtotal);
    } else {
        console.warn("⚠️ Subtotal element not found in DOM");
    }
    
    // Enable/disable checkout button
    if (checkoutButton) {
        if (subtotal > 0) {
            checkoutButton.disabled = false;
            checkoutButton.classList.remove("disabled");
            console.log("✅ Checkout button enabled");
        } else {
            checkoutButton.disabled = true;
            checkoutButton.classList.add("disabled");
            console.log("❌ Checkout button disabled (empty cart)");
        }
    }
}

// Attach event listeners to cart items
function attachCartEvents() {
    console.log("🔗 Attaching cart event listeners");
    
    // Plus button event
    document.querySelectorAll(".cart-item .quantity-btn.plus").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-cart-id");
            await updateCartItemQuantity(cartId, 1);
        });
    });
    
    // Minus button event
    document.querySelectorAll(".cart-item .quantity-btn.minus").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-cart-id");
            await updateCartItemQuantity(cartId, -1);
        });
    });
    
    // Remove button event - using data-id attribute from second code
    document.querySelectorAll(".remove-from-cart").forEach(button => {
        button.addEventListener("click", async (event) => {
            const cartId = event.target.getAttribute("data-id");
            console.log("🗑 Remove button clicked for item:", cartId);
            await removeCartItem(cartId);
        });
    });
    
    // Add direct event listener for checkout button again (for redundancy)
    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            console.log("🛒 Checkout button clicked");
            if (subtotal > 0) {
                window.location.href = "checkout.html";
            } else {
                alert("Your cart is empty. Add items before checkout.");
            }
        });
    }
}

// Update cart item quantity
async function updateCartItemQuantity(cartId, change) {
    try {
        // Find cart item
        const cartItem = cartItems.find(item => item.id === cartId);
        if (!cartItem) {
            console.error("❌ Cart item not found:", cartId);
            return;
        }
        
        // Calculate new quantity
        const newQuantity = cartItem.quantity + change;
        
        // Validate new quantity
        if (newQuantity < 1) {
            // If quantity becomes 0, remove the item
            await removeCartItem(cartId);
            return;
        }
        
        // Update quantity in Firestore
        await updateDoc(doc(db, "cart", cartId), {
            quantity: newQuantity
        });
        
        // Update local data
        cartItem.quantity = newQuantity;
        
        // Update quantity display
        const quantityElement = document.querySelector(`#cart-quantity-${cartId}`);
        if (quantityElement) {
            quantityElement.textContent = newQuantity;
        }
        
        // Recalculate subtotal
        calculateSubtotal();
        
        console.log(`✅ Cart item quantity updated: ${cartId} -> ${newQuantity}`);
        
    } catch (error) {
        console.error("❌ Error updating cart item quantity:", error);
        alert("Error updating item quantity. Please try again.");
    }
}

// Remove cart item
async function removeCartItem(itemId) {
    try {
        console.log(`🗑 Removing cart item: ${itemId}`);
        
        // Delete from Firestore
        await deleteDoc(doc(db, "cart", itemId));
        
        // Remove from local data
        cartItems = cartItems.filter(item => item.id !== itemId);
        
        // Remove from DOM - simpler selector that works with both structures
        const cartItemElement = document.querySelector(`.cart-item[data-cart-id="${itemId}"]`) || 
                               document.querySelector(`button[data-id="${itemId}"]`).closest('.cart-item');
        
        if (cartItemElement) {
            cartItemElement.remove();
            console.log("✅ Cart item removed from DOM");
        } else {
            console.warn("⚠️ Could not find cart item element in DOM");
            // Refresh entire cart to be safe
            renderCartItems();
        }
        
        // Recalculate subtotal
        calculateSubtotal();
        
        // If cart is now empty, show empty message
        if (cartItems.length === 0) {
            displayEmptyCart();
        }
        
        console.log(`✅ Cart item removed: ${itemId}`);
        
    } catch (error) {
        console.error("❌ Error removing cart item:", error);
        alert("Error removing item from cart. Please try again.");
    }
}

// Calculate subtotal
function calculateSubtotal() {
    subtotal = 0;
    
    cartItems.forEach((item) => {
        const product = productDetails[item.productId];
        if (product) {
            subtotal += product.price * item.quantity;
        }
    });
    
    console.log("💰 Recalculated subtotal:", subtotal);
    updateSubtotal();
}

// Validate Image URL helper function
function validateImageUrl(url) {
    return url && url.startsWith("http") && !url.includes("google.com/url");
}

// Export functions for reuse
export { fetchCartItems, updateCartItemQuantity, removeCartItem };