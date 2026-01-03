const STORAGE_KEYS = {
	ALPHA_VANTAGE_KEY: 'alphaVantageKey',
	FRED_KEY: 'fredApiKey',
	GEMINI_KEY: 'geminiApiKey',
	LAST_SYMBOL: 'lastSymbol',
};

export function getStorageKeys(){
	return STORAGE_KEYS;
}

export function setLocal(key, value){
	localStorage.setItem(key, value);
}

export function getLocal(key, fallback=''){
	return localStorage.getItem(key) ?? fallback;
}

export function ensureDefaultStorage(){
	if(localStorage.getItem(STORAGE_KEYS.LAST_SYMBOL) == null){
		localStorage.setItem(STORAGE_KEYS.LAST_SYMBOL, 'AAPL');
	}
}
