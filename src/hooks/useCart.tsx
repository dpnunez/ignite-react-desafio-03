import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
			const { data: productOnStock } = await api.get<Stock>(`/stock/${productId}`)
			const productOnCart = cart.find(item => item.id === productId)


			if (productOnCart && productOnCart?.amount + 1 > productOnStock?.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return
			}

			if (productOnCart) {
				const newCartState = cart.map(product => {
					if (product.id === productId) {
						return {
							...product,
							amount: product.amount + 1
						}
					}

					return product
				})

				setCart(newCartState)
				localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState))
				return
			}

			const { data: shoesData } = await api.get<Product>(`/products/${productId}`)
			const newCartState = [...cart, {...shoesData, amount: 1 }]

			setCart(newCartState)
			localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState))
	
    } catch {
			toast.error('Erro na adição do produto');
    }
  };



  const removeProduct = (productId: number) => {
    try {
			const isOnCart = cart.some(product => product.id === productId)
			if (!isOnCart) throw new Error()
			const newCartState = cart.filter(product => product.id !== productId)

			setCart(newCartState)
			localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
			if (amount < 1) throw new Error()
			const { data: productOnStock } = await api.get<Stock>(`/stock/${productId}`)
			if (productOnStock && amount > productOnStock?.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return
			}


      const newCartState = cart.map(product => {
				if (product.id === productId) {
					return {
						...product,
						amount
					}
				}
				return product
			})
			setCart(newCartState)
			localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState))
    } catch {
			toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
