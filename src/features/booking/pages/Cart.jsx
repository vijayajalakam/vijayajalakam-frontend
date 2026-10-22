import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { 
  selectUserCart, 
  removeFromUserCart, 
  updateUserCartQty,
  selectUserCartCount 
} from '../../../store/slices/userAppSlice';
import { useAuth } from '../../auth/hooks/useAuth';

const Cart = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currencySymbol } = useAuth();
  const cart = useSelector(selectUserCart);
  const cartCount = useSelector(selectUserCartCount);

  const handleQuantityChange = (item, newQuantity) => {
    if (newQuantity < 1) {
      dispatch(removeFromUserCart({ 
        id: item._id, 
        itemType: item.itemType,
        variantId: item.variantId 
      }));
    } else {
      dispatch(updateUserCartQty({ 
        id: item._id, 
        itemType: item.itemType,
        variantId: item.variantId,
        qty: newQuantity 
      }));
    }
  };

  const handleRemoveItem = (item) => {
    dispatch(removeFromUserCart({ 
      id: item._id, 
      itemType: item.itemType,
      variantId: item.variantId 
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.qty || 1;
      return total + (price * quantity);
    }, 0);
  };

  const handleCheckout = () => {
    navigate(`/${shopSlug}/user/cart-checkout`);
  };

  if (cartCount === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="bg-gray-50 dark:bg-dark-card p-8 rounded-3xl mb-6 shadow-sm">
          <ShoppingCart size={64} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Your Cart is Empty</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 max-w-md">
          Looks like you haven't added any items to your cart yet. Start shopping to fill it up!
        </p>
        <button
          onClick={() => navigate(`/${shopSlug}/user/home`)}
          className="px-8 py-3 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">
          Shopping Cart
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item, index) => (
            <div
              key={`${item._id}-${item.itemType}-${item.variantId || 'base'}-${index}`}
              className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-4 md:p-5 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex gap-4">
                {/* Item Image */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-100 dark:bg-dark-card flex items-center justify-center overflow-hidden shrink-0">
                  {item.image || item.images?.[0] ? (
                    <img 
                      src={item.image || item.images[0]} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={32} className="text-gray-300 dark:text-gray-600" />
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark-card rounded-xl p-1">
                      <button
                        onClick={() => handleQuantityChange(item, item.qty - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:bg-dark-surface dark:hover:bg-dark-surface transition-all active:scale-95"
                      >
                        <Minus size={14} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-gray-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item, item.qty + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:bg-dark-surface dark:hover:bg-dark-surface transition-all active:scale-95"
                      >
                        <Plus size={14} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-base md:text-lg font-black text-brand-primary dark:text-blue-400 notranslate">
                        {currencySymbol}{(item.price * item.qty).toFixed(2)}
                      </p>
                      {item.qty > 1 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {currencySymbol}{item.price.toFixed(2)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-5 md:p-6 sticky top-24">
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-bold text-gray-900 dark:text-white notranslate">
                  {currencySymbol}{calculateTotal().toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  Calculated at checkout
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-dark-border pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-black text-brand-primary dark:text-blue-400 notranslate">
                    {currencySymbol}{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-3.5 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20 active:scale-95 flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate(`/${shopSlug}/user/home`)}
              className="w-full mt-3 py-3 bg-gray-50 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition-all active:scale-95"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
