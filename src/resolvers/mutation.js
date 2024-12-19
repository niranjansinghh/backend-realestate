const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const mongoose = require('mongoose');
require('dotenv').config()

module.exports = {
    addHouse: async (parent, { title, description = "null", price, location, houseType, images = "" }, { models, user }) => {

        if (!user) {
            throw new AuthenticationError('You must be signed in to create a note');
        }

        if (!title || !price || !location || !houseType) {
            throw new Error("Missing required fields. Ensure all required inputs are provided.");
        }

        // Create a new house object
        return await models.House.create({
            title,
            description, // Default to empty string if null
            price,
            location,
            houseType,
            images,
            owner: new mongoose.Types.ObjectId(user.id)
        });


    },

    deleteHouse: async (parent, { houseId }, { models, user }) => {

        if (!user) {
            throw new AuthenticationError('You must be signed in to delete a note');
        }
        console.log("done1")
        const house = await models.House.findById(houseId);

        console.log("done2")
        if (house && String(house.owner) !== user.id) {
            throw new ForbiddenError("You don't have permissions to delete the note");
        }

        try {
            await house.deleteOne();
            console.log("House removed successfully");
            return true;
        } catch (err) {
            console.error("Error removing the house:", err); return false;
        }
    },

    register: async (parent, { username, email, password }, { models }) => {
        email = email.trim().toLowerCase()

        const hashed = await bcrypt.hash(password, 10);

        try {
            //user is created
            const user = await models.User.create({
                username,
                email,
                password: hashed
            });

            // create and return the json web token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET,);

            //returns user info along with token
            return { ...user._doc, id: user._id, token, };
        } catch (err) {
            // if there's a problem creating the account, throw an error
            throw new Error(err);
        }
    },

    login: async (parent, { email, password }, { models }) => {
        if (email) { email = email.trim().toLowerCase(); }

        const user = await models.User.findOne({ email });

        if (!user) {
            throw new AuthenticationError('User not found');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new AuthenticationError('Invalid Password');
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        return { ...user._doc, id: user._id, token, };

    },

    bookHouse: async (parent, { houseId, userId }, { models }) => {
        try {
            // Validate the house and user exist (optional but recommended)
            const house = await models.House.findById(houseId);
            if (!house) {
                throw new Error('House not found');
            }
            const user = await models.User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create a new booking
            const booking = new models.Booking({
                house: houseId,
                user: userId,
                bookingDate: new Date(), // Booking date is set to the current time
                status: 'confirmed',      // Default status
            });

            // Save the booking to the database
            const savedBooking = await booking.save();

            // Populate the booking with house and user details before returning
            const populatedBooking = await models.Booking.findById(booking._id)
            .populate('house')
            .populate('user');
            return populatedBooking;
        } catch (error) {
            throw new Error(error);
        }
    },

    signup: async (_, { email, password }, { models }) => {
        // Validate input
        if (!email || !password) {
            throw new Error("Email and password are required.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await models.User.create({ email, password: hashedPassword });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        return { token, user };
    },




}