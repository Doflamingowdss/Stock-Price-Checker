'use strict';

require("dotenv").config();
const { Stocks, anonymizeIP } = require('../models');
const fetch = require('node-fetch');

const saveStock = async (symbol, like, ip) => {
  try {
    let stock = await Stocks.findOne({ symbol: symbol.toUpperCase() });
    
    if (!stock) {
      stock = new Stocks({ 
        symbol: symbol.toUpperCase(),
        likes: like ? [anonymizeIP(ip)] : []
      });
    } else if (like) {
      await stock.addLike(ip);
    }
    
    return stock;
  } catch (error) {
    console.error('Error saving stock:', error);
    throw error;
  }
};

const getStockPrice = async (stockSymbol) => {
  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`
    );
    const data = await response.json();
    return {
      stock: data.symbol,
      price: data.latestPrice,
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
};

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        let { stock, like } = req.query;
        const stocks = Array.isArray(stock) ? stock : [stock];
        
        if (stocks.length > 2) {
          return res.json({ error: 'Maximum 2 stocks allowed' });
        }

        const results = await Promise.all(
          stocks.map(async (symbol) => {
            const [stockDoc, priceData] = await Promise.all([
              saveStock(symbol, like, req.ip),
              getStockPrice(symbol)
            ]);
            return { ...priceData, likes: stockDoc.likes.length };
          })
        );

        if (results.length === 2) {
          const [stock1, stock2] = results;
          return res.json({
            stockData: [
              { 
                stock: stock1.stock,
                price: stock1.price,
                rel_likes: stock1.likes - stock2.likes
              },
              {
                stock: stock2.stock,
                price: stock2.price,
                rel_likes: stock2.likes - stock1.likes
              }
            ]
          });
        }

        res.json({ stockData: results[0] });
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
};