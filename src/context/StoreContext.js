import React, { createContext, useState } from 'react';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  const addToCart = (game) => {
    if (!cart.find(item => item.id === game.id)) {
      setCart([...cart, game]);
    }
  };

  const removeFromCart = (gameId) => {
    setCart(cart.filter(item => item.id !== gameId));
  };

  return (
    <StoreContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </StoreContext.Provider>
  );
};