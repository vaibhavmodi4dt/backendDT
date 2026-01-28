'use strict';

/**
 * HVT (High-Velocity Testing) Module
 * 
 * Provides comprehensive workflow for:
 * - Module management (Sales, Marketing, Product, etc.)
 * - Problem identification and tracking
 * - Idea generation with ICE scoring
 * - Experiment lifecycle with state machine
 * - Results logging and learnings capture
 * - Escalation management for blocked experiments
 * - Ticket integration for approved ideas
 * - Updates and metrics tracking
 * - Role-based access control
 */

const modules = require('./modules');
const problems = require('./problems');
const ideas = require('./ideas');
const experiments = require('./experiments');
const results = require('./results');
const learnings = require('./learnings');
const escalations = require('./escalations');
const tickets = require('./tickets');
const updates = require('./updates');
const roles = require('./roles');
const metrics = require('./metrics');
const helpers = require('./helpers');

const HVT = module.exports;

// Re-export all submodules
HVT.modules = modules;
HVT.problems = problems;
HVT.ideas = ideas;
HVT.experiments = experiments;
HVT.results = results;
HVT.learnings = learnings;
HVT.escalations = escalations;
HVT.tickets = tickets;
HVT.updates = updates;
HVT.roles = roles;
HVT.metrics = metrics;
HVT.helpers = helpers;
HVT.cache = require('./cache');
HVT.monitoring = require('./monitoring');
