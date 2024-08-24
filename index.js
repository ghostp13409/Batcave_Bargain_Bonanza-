const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');


const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/assignment4');

const cartSchema = mongoose.Schema({
    name : String,
    price : Number,
    quantity : Number
})

const orderSchema = mongoose.Schema({
    name : String,
    email : String,
    phone : String,
    address : String,
    city : String,
    province: String,
    postalCode : String,
    deliveryTime : Number, 
    cart : [cartSchema],
    shippingCharge: Number,
    subTotal : Number,
    taxRate: Number,
    tax : Number,
    total : Number
})

const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);


// Set up Vaiables to use Packages
let app = new express();
app.use(bodyParser.urlencoded({extended:false}));

// Set up Products

let productArray = [];

const AddItem = (productid, description, name, price) => productArray.push({productid, name, description, price});

AddItem("batarangsId", "Perfect for throwing at bad guys or that one annoying coworker." , "batarangs", 12);

AddItem("jokerTeethId", "Guaranteed to make you laugh… or scream. Great for pranks or scaring off unwanted guests" , "Joker Teeth", 6);

AddItem("batMobileId", "Why drive a regular car when you can own the Batmobile? (slightly used, low mileage)" , "BatMobile", 150000);

AddItem("batSuitId", "Become the hero Gotham deserves — (may cause brooding and a sudden desire to stand dramatically on rooftops.", "BatSuit", 10000);

// Setup Arrays

let orders = [];
let cartItems = [];

// set path to public folders and view folders

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');


// set up different routes (pages) of the website

//home page
app.get('/', function(req, res){
    res.render('home');
});

//Sale Page
app.get('/saleForm', function(req, res){
    const items = {
        products: productArray
    };
    res.render('saleForm', items);
})

// All Order Page
app.get('/allorders', (req, res) => {
    Order.find()
    .then(((orders) => {
        res.render('allorders', {orderList: orders});
    }))
    .catch((err) => {
        res.render('saleForm', { errors: err });
    })
})

app.get('/orderdetails/:orderId', async (req, res) => {
    try{
        let orderId = req.params.orderId;
        console.log(orderId);
        const order = await Order.findById({_id: orderId});
        console.log(order.total);
        res.render('orderdetails', order);
        // if(order){
            
        // }
        // else{
        //     res.render('/allorders', { errors: 'Could not load Order Details.' });
        // }
    }
    catch(err){
        res.render('/allorders', { errors: err});
    }
})


// Validation Logic

    // Validation Regexes
    let validPhone = /^\d{3}[ -]?\d{3}[ -]?\d{4}$/;
    let validPostalCode = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    // Customer Validation Function

    const CheckRegex = (userInput, regex) => regex.test(userInput);

    // Customer Validation Methods

    const customPhoneValidation = (value) => {
        if(!CheckRegex(value, validPhone)){
            throw new Error('Invalid Phone Number');
        }
        else{
            return true;
        }
    }
    
    const customPostalCode = (value) => {
        if(!CheckRegex(value, validPostalCode)){
            throw new Error('Invalid Postal Code');
        }
        else{
            return true;
        }
    }


// Calculation Logic

    const provinceRates = [
        { province: "Alberta", tax: 5, shipping: 10 },
        { province: "British Columbia", tax: 12, shipping: 15 },
        { province: "Manitoba", tax: 12, shipping: 10 },
        { province: "New Brunswick", tax: 15, shipping: 15 },
        { province: "Newfoundland and Labrador", tax: 15, shipping: 15 },
        { province: "Nova Scotia", tax: 15, shipping: 15 },
        { province: "Ontario", tax: 13, shipping: 10 },
        { province: "Prince Edward Island", tax: 15, shipping: 15 },
        { province: "Quebec", tax: 14.975, shipping: 10},
        { province: "Saskatchewan", tax: 11, shipping: 10 },
      ];

      const deliveryCost = [
        {time: 3, cost: 20},
        {time: 5, cost: 15},
        {time: 10, cost: 10},
      ]


    // Get Order
    const GetOrder = (req) => {

        orders = [];
        cartItems = [];
        productArray.forEach(item => {
            let itemQuantity = 0;

            req.body[`${item.name}`] != "" ? itemQuantity = parseInt(req.body[`${item.name}`]) : itemQuantity = 0;

            if(itemQuantity > 0){
                let currentOrder = {
                    name: item.name,
                    price: item.price,
                    quantity: itemQuantity
                }
                orders.push(currentOrder);
                let newCart = new Cart(currentOrder);
                cartItems.push(newCart);
            }
        });
    }

    const CalcShipping = (province, deliveryTime) => {
        let timeCost = deliveryCost.find(cost => cost.time === deliveryTime);
        let shippingCharge = provinceRates.find(shipping => shipping.province === province);
        return timeCost.cost + shippingCharge.shipping;
    }

    const CalcSubTotal = () => {
        let subTotal = 0;
        orders.forEach(order =>{
            subTotal += order.price * order.quantity;
        })
        return subTotal;
    }

    const CalcTax = (subTotal, province) => {
        let taxRate = provinceRates.find(tax => tax.province === province);
        return subTotal * (taxRate.tax / 100);
    }



// Get Data Logic

app.post('/saleForm', [
    check('nameN', "Name is Missing").notEmpty(),
    check('emailN', "Email is Missing").notEmpty(),
    check('emailN', "Email is not valid").isEmail(),
    check('phoneN', "Phone is Missing").notEmpty(),
    check('phoneN', '').custom(customPhoneValidation),
    check('addressN', "Address is Missing").notEmpty(),
    check('cityN', "City is Missing").notEmpty(),
    check('postalCodeN', "Postal Code is Missing").notEmpty(),
    check('postalCodeN', '').custom(customPostalCode),
], function(req, res){

    GetOrder(req);
    let products = productArray;
    let errors = validationResult(req);
    if(!orders.length > 0){
        errors.errors.push({msg : "You must select at least one item"});
    }
    else{
        if(CalcSubTotal() < 10){
            errors.errors.push({msg : "Total purchase must be greater than 10"});
        }
    }
    
    productArray.forEach(item => {
        check(`${item.productId}N`, `${item.name} is not a nubmer`).isInt()
    })
    if(!errors.isEmpty()){
        var pageData = {
            products: products,
            errors : errors.array()
        }
        res.render('saleForm', pageData);
    }
    else{

        // Get Data
        var name = req.body.nameN;
        var email = req.body.emailN;
        var phone = req.body.phoneN;
        var address = req.body.addressN;
        var city = req.body.cityN;
        var postalCode = req.body.postalCodeN;
        var province = req.body.provinceN;
        var deliveryTime = parseInt(req.body.deliveryTimeN);
        var cart = cartItems;
        var shippingCharge = CalcShipping(province, deliveryTime);
        var taxRate = provinceRates.find(tax => tax.province === province).tax;
    
        // Calculation Logic
        
        let subTotal = CalcSubTotal();
        let tax = CalcTax(subTotal, province).toFixed(2);
        let total = subTotal + tax + shippingCharge;
    
        var orderData = {
            name : name,
            email : email,
            phone : phone,
            address : address,
            city : city,
            province: province,
            postalCode : postalCode,
            deliveryTime : deliveryTime, 
            cart : cart,
            shippingCharge: shippingCharge,
            subTotal : subTotal,
            taxRate: taxRate,
            tax : tax,
            total : total
        }
        var pageData = {
            
            products: products,

            name : name,
            email : email,
            phone : phone,
            address : address,
            city : city,
            province: province,
            postalCode : postalCode,
            deliveryTime : deliveryTime, 
            orders : orders,
            shippingCharge: shippingCharge,
            subTotal : subTotal,
            taxRate: taxRate,
            tax : tax,
            total : total
        }
        cartItems = [];
        orders = [];
        let newOrder = new Order(orderData);
        newOrder.save().then(()=>{
            res.render('saleForm', pageData);
        })
        newOrder.save().then(function() {
            res.render('saleForm', pageData);
        })
        res.render('saleForm', pageData);
    }

});




app.listen(8080);


//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');
console.log('http://localhost:8080/');