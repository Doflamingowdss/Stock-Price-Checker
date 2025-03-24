'use strict';

require("dotenv").config();
const { Stocks, anonymizeIP } = require('../models');
const fetch = require('node-fetch');

const getStockPrice = async (symbol) => {
  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data || !data.symbol || data.latestPrice === undefined || data.latestPrice === null) {
      throw new Error('Invalid stock data received');
    }
    return {
      stock: data.symbol,
      price: Number(data.latestPrice)
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
};

const saveStock = async (symbol, like, ip) => {
  try {
    let stock = await Stocks.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      stock = new Stocks({
        symbol: symbol.toUpperCase(),
        likes: like ? [anonymizeIP(ip)] : []
      });
    } else if (like && !stock.likes.includes(anonymizeIP(ip))) {
      stock.likes.push(anonymizeIP(ip));
    }
    await stock.save();
    return stock;
  } catch (error) {
    console.error('Error saving stock:', error);
    return null;
  }
};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;
        const stocks = Array.isArray(stock) ? stock : [stock];

        if (!stocks[0]) {
          return res.json({ stockData: { error: 'Stock symbol is required' } });
        }

        if (stocks.length > 2) {
          return res.json({ stockData: { error: 'Maximum 2 stocks allowed' } });
        }

        const results = await Promise.all(
          stocks.map(async (symbol) => {
            try {
              const [priceData, stockDoc] = await Promise.all([
                getStockPrice(symbol),
                saveStock(symbol, like, req.ip)
              ]);
              
              if (!priceData || !stockDoc) {
                return null;
              }

              return {
                ...priceData,
                likes: stockDoc.likes.length
              };
            } catch (error) {
              console.error(`Error processing stock ${symbol}:`, error);
              return null;
            }
          })
        );

        // Filter out any failed requests
        const validResults = results.filter(result => result !== null);

        if (validResults.length === 0) {
          return res.json({ stockData: { error: 'Invalid stock symbol(s)' } });
        }

        if (validResults.length === 2) {
          return res.json({
            stockData: [
              {
                stock: validResults[0].stock,
                price: validResults[0].price,
                rel_likes: validResults[0].likes - validResults[1].likes
              },
              {
                stock: validResults[1].stock,
                price: validResults[1].price,
                rel_likes: validResults[1].likes - validResults[0].likes
              }
            ]
          });
        }

        res.json({
          stockData: {
            stock: validResults[0].stock,
            price: validResults[0].price,
            likes: validResults[0].likes
          }
        });
      } catch (error) {
        console.error('API Error:', error);
        res.json({ stockData: { error: 'Server error' } });
      }
    });
};