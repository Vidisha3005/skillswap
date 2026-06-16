const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/trends
// @desc    Get skill demand and trend analysis (ML Clustering simulation)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find({ isActive: true });

        const demandCount = {};
        const supplyCount = {};

        users.forEach(user => {
            user.skillsToLearn.forEach(skill => {
                const s = skill.toLowerCase().trim();
                demandCount[s] = (demandCount[s] || 0) + 1;
            });
            user.skillsToTeach.forEach(skill => {
                const s = skill.toLowerCase().trim();
                supplyCount[s] = (supplyCount[s] || 0) + 1;
            });
        });

        // Transform into arrays and sort
        const topDemand = Object.entries(demandCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topSupply = Object.entries(supplyCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Identify "Hot Skills" (High demand, low supply)
        const hotSkills = Object.entries(demandCount)
            .map(([name, dCount]) => {
                const sCount = supplyCount[name] || 0;
                const gap = dCount - sCount;
                return { name, dCount, sCount, gap };
            })
            .filter(s => s.gap > 0)
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 3);

        // Categorize skills using "K-Means logic" (Simulation)
        const allUniqueSkills = [...new Set([...Object.keys(demandCount), ...Object.keys(supplyCount)])];
        const clusters = {
            "High Growth": [],
            "Stable/Expert": [],
            "Emerging": []
        };

        allUniqueSkills.forEach(skill => {
            const d = demandCount[skill] || 0;
            const s = supplyCount[skill] || 0;

            if (d > s && s <= 2) clusters["High Growth"].push(skill);
            else if (s >= 2) clusters["Stable/Expert"].push(skill);
            else if (d > 0) clusters["Emerging"].push(skill);
        });

        // Ensure High Growth is not empty if we have data
        if (clusters["High Growth"].length === 0) {
            if (hotSkills.length > 0) {
                clusters["High Growth"] = hotSkills.map(s => s.name);
            } else {
                // Default high growth skills for empty/new platforms
                clusters["High Growth"] = ["Machine Learning", "Digital Marketing", "React Native", "Data Analysis"];
            }
        }

        res.json({
            success: true,
            topDemand,
            topSupply,
            hotSkills,
            clusters: {
                highGrowth: clusters["High Growth"].slice(0, 4),
                stable: clusters["Stable/Expert"].slice(0, 4),
                emerging: clusters["Emerging"].slice(0, 4)
            }
        });

    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
