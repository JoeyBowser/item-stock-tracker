import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Item {
  id?: string;
  name: string;
  productUrl: string;
  apiUrl: string;
}

export default function StockChecker() {
  const [itemsToWatch, setItemsToWatch] = useState<Item[]>([]);
  const [inStockItems, setInStockItems] = useState<{ name: string; time: string }[]>([]);
  const [newItem, setNewItem] = useState<{ name: string; productUrl: string; apiUrl: string }>({
    name: "",
    productUrl: "",
    apiUrl: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), (snapshot) => {
      const items: Item[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      setItemsToWatch(items);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkStock = async () => {
      const results: { name: string; time: string }[] = [];

      for (const item of itemsToWatch) {
        try {
          const res = await fetch(item.apiUrl);
          const data = await res.json();
          const fulfillment = data?.data?.product?.fulfillment;

          const inStore = fulfillment?.store_options?.some(
            (s: any) => s?.location_available_to_promise_quantity > 0
          );
          const ship =
            fulfillment?.shipping_options?.availability_status === "IN_STOCK" &&
            fulfillment?.shipping_options?.available_to_promise_quantity > 0;

          if (inStore || ship) {
            const timestamp = new Date().toLocaleTimeString();
            results.push({ name: item.name, time: timestamp });
            window.open(item.productUrl, "_blank");
            if (navigator.vibrate) navigator.vibrate(300);
          }
        } catch (e) {
          console.error("Error checking stock for", item.name, e);
        }
      }

      setInStockItems(results);
    };

    if (itemsToWatch.length > 0) {
      checkStock();
      const interval = setInterval(checkStock, 30000);
      return () => clearInterval(interval);
    }
  }, [itemsToWatch]);

  const handleAddItem = async () => {
    if (newItem.name && newItem.apiUrl && newItem.productUrl) {
      await addDoc(collection(db, "items"), newItem);
      setNewItem({ name: "", productUrl: "", apiUrl: "" });
    }
  };

  const handleRemoveItem = async (id?: string) => {
    if (id) {
      await deleteDoc(doc(db, "items", id));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Target Stock Watch</h1>

      <div className="mb-6 space-y-2">
        <input
          className="w-full p-2 border rounded"
          type="text"
          placeholder="Item name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          className="w-full p-2 border rounded"
          type="text"
          placeholder="Product URL"
          value={newItem.productUrl}
          onChange={(e) => setNewItem({ ...newItem, productUrl: e.target.value })}
        />
        <input
          className="w-full p-2 border rounded"
          type="text"
          placeholder="API URL"
          value={newItem.apiUrl}
          onChange={(e) => setNewItem({ ...newItem, apiUrl: e.target.value })}
        />
        <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded">
          ➕ Add Item
        </button>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Watching:</h2>
        {itemsToWatch.length === 0 ? (
          <p className="text-gray-500">No items being watched.</p>
        ) : (
          <ul className="space-y-1">
            {itemsToWatch.map((item, index) => (
              <li key={item.id || index} className="flex justify-between items-center">
                <span>{item.name}</span>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inStockItems.length === 0 ? (
        <p className="text-gray-600">🔍 All items currently out of stock.</p>
      ) : (
        <ul className="space-y-2">
          {inStockItems.map((item, index) => (
            <li key={index} className="text-green-600">
              ✅ <a href={itemsToWatch.find(i => i.name === item.name)?.productUrl} target="_blank">{item.name}</a> is in stock at {item.time}!
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <button onClick={() => location.reload()} className="px-4 py-2 bg-gray-700 text-white rounded">
          🔄 Refresh Now
        </button>
      </div>
    </div>
  );
}
