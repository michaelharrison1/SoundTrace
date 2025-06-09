
// import { useState, useEffect } from 'react';

// function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
//   const [storedValue, setStoredValue] = useState<T>(() => {
//     if (typeof window === "undefined") {
//       return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
//     }
//     try {
//       const item = window.localStorage.getItem(key);
//       if (item) {
//         return JSON.parse(item);
//       } else {
//         const valToStore = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
//         window.localStorage.setItem(key, JSON.stringify(valToStore));
//         return valToStore;
//       }
//     } catch (error) {
//       console.error(`Error reading localStorage key "${key}":`, error);
//       return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
//     }
//   });

//   useEffect(() => {
//     try {
//       if (typeof window !== "undefined") {
//         window.localStorage.setItem(key, JSON.stringify(storedValue));
//       }
//     } catch (error) {
//       console.error(`Error setting localStorage key "${key}":`, error);
//     }
//   }, [key, storedValue]);

//   return [storedValue, setStoredValue];
// }

// export default useLocalStorage;

// This hook is no longer used for previousScans in MainAppLayout.
// It can be fully removed if not used by any other component.
// For now, making it an empty export to avoid breaking imports if any.
import React from 'react'; // Added React import for useState

export default function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    console.warn("useLocalStorage is deprecated in this project for core scan data. Data is now fetched from backend.");
    const [state, setState] = React.useState(typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
    return [state, setState];
}
