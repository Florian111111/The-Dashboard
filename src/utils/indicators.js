export function computeSMA(values, period){
	if(!Array.isArray(values) || period<=0) return [];
	const out=[]; let sum=0; const q=[];
	for(let i=0;i<values.length;i++){
		const v=Number(values[i]); if(!isFinite(v)) { out.push(undefined); continue; }
		sum+=v; q.push(v);
		if(q.length>period){ sum-=q.shift(); }
		out.push(q.length===period ? sum/period : undefined);
	}
	return out;
}

export function computeRSI(values, period=14){
	if(!Array.isArray(values) || values.length<2) return [];
	const gains=[]; const losses=[];
	for(let i=1;i<values.length;i++){
		const diff = Number(values[i]) - Number(values[i-1]);
		gains.push(Math.max(0,diff));
		losses.push(Math.max(0,-diff));
	}
	let avgGain = average(gains.slice(0,period));
	let avgLoss = average(losses.slice(0,period));
	const out = new Array(period).fill(undefined);
	for(let i=period;i<gains.length;i++){
		avgGain = (avgGain*(period-1) + gains[i]) / period;
		avgLoss = (avgLoss*(period-1) + losses[i]) / period;
		const rs = avgLoss===0 ? 100 : avgGain/avgLoss;
		const rsi = 100 - (100/(1+rs));
		out.push(rsi);
	}
	return out;
}

export function computeEMA(values, period){
	if(!Array.isArray(values) || period<=0) return [];
	const multiplier = 2 / (period + 1);
	const out = new Array(period-1).fill(undefined);
	
	// Start with SMA for the first EMA value
	const sma = average(values.slice(0, period));
	out.push(sma);
	
	for(let i = period; i < values.length; i++){
		const ema = (values[i] * multiplier) + (out[i-1] * (1 - multiplier));
		out.push(ema);
	}
	return out;
}

export function computeMACD(values, fastPeriod=12, slowPeriod=26, signalPeriod=9){
	if(!Array.isArray(values) || values.length < slowPeriod) return {macd: [], signal: [], histogram: []};
	
	const emaFast = computeEMA(values, fastPeriod);
	const emaSlow = computeEMA(values, slowPeriod);
	
	const macd = [];
	for(let i = 0; i < values.length; i++){
		if(emaFast[i] !== undefined && emaSlow[i] !== undefined){
			macd.push(emaFast[i] - emaSlow[i]);
		} else {
			macd.push(undefined);
		}
	}
	
	const signal = computeEMA(macd.filter(v => v !== undefined), signalPeriod);
	const histogram = [];
	
	for(let i = 0; i < macd.length; i++){
		if(macd[i] !== undefined && signal[i] !== undefined){
			histogram.push(macd[i] - signal[i]);
		} else {
			histogram.push(undefined);
		}
	}
	
	return {macd, signal, histogram};
}

export function computeBollingerBands(values, period=20, stdDev=2){
	if(!Array.isArray(values) || period<=0) return {upper: [], middle: [], lower: []};
	
	const sma = computeSMA(values, period);
	const upper = [];
	const lower = [];
	
	for(let i = period-1; i < values.length; i++){
		const slice = values.slice(i-period+1, i+1);
		const mean = sma[i];
		const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
		const standardDeviation = Math.sqrt(variance);
		
		upper.push(mean + (stdDev * standardDeviation));
		lower.push(mean - (stdDev * standardDeviation));
	}
	
	return {
		upper: new Array(period-1).fill(undefined).concat(upper),
		middle: sma,
		lower: new Array(period-1).fill(undefined).concat(lower)
	};
}

export function computeStochastic(highs, lows, closes, kPeriod=14, dPeriod=3){
	if(!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes)) return {k: [], d: []};
	
	const k = [];
	for(let i = kPeriod-1; i < closes.length; i++){
		const highSlice = highs.slice(i-kPeriod+1, i+1);
		const lowSlice = lows.slice(i-kPeriod+1, i+1);
		const currentClose = closes[i];
		
		const highestHigh = Math.max(...highSlice);
		const lowestLow = Math.min(...lowSlice);
		
		const stochK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
		k.push(stochK);
	}
	
	const d = computeSMA(k, dPeriod);
	
	return {
		k: new Array(kPeriod-1).fill(undefined).concat(k),
		d: new Array(kPeriod-1).fill(undefined).concat(d)
	};
}

export function computeWilliamsR(highs, lows, closes, period=14){
	if(!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes)) return [];
	
	const williamsR = [];
	for(let i = period-1; i < closes.length; i++){
		const highSlice = highs.slice(i-period+1, i+1);
		const lowSlice = lows.slice(i-period+1, i+1);
		const currentClose = closes[i];
		
		const highestHigh = Math.max(...highSlice);
		const lowestLow = Math.min(...lowSlice);
		
		const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
		williamsR.push(wr);
	}
	
	return new Array(period-1).fill(undefined).concat(williamsR);
}

function average(arr){
	if(!arr.length) return 0;
	return arr.reduce((a,b)=>a+Number(b||0),0)/arr.length;
}
