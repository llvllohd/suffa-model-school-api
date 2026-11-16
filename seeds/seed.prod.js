require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Category = require('../src/modules/categories/category.model');
const Subject = require('../src/modules/subjects/subject.model');
const Class = require('../src/modules/classes/class.model');
const Section = require('../src/modules/sections/section.model');

const seedProd = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB Connected - PROD');

    // ⚠️ PROD - NO deleteMany() - NEVER wipes

    // 1. Admin - Only if not exists
    // Change these 3 lines to real Admin details before running
    const ADMIN_PHONE = '9999999999';
    const ADMIN_EMAIL = 'admin@suffa.com';
    const ADMIN_PASSWORD = 'Admin@123';

    let admin = await User.findOne({ $or: [{ phone: ADMIN_PHONE }, { email: ADMIN_EMAIL }] });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log('✅ Admin Created:', ADMIN_PHONE);
    } else {
      console.log('⏭️ Admin Already Exists - Skipped');
    }

    // 2. Categories - Only if not exists
    const getOrCreateCategory = async (name) => {
      let cat = await Category.findOne({ name });
      if (!cat) cat = await Category.create({ name });
      return cat;
    };
    const words = await getOrCreateCategory('Words');
    const reading = await getOrCreateCategory('Reading');
    const writing = await getOrCreateCategory('Writing');
    console.log('✅ Categories Checked');

    // 3. Subjects - Only if not exists
    const getOrCreateSubject = async (name, defaultCategories) => {
      let sub = await Subject.findOne({ name });
      if (!sub) sub = await Subject.create({ name, defaultCategories });
      return sub;
    };
    await getOrCreateSubject('English', [
      { categoryId: words._id, maxMarks: 20, order: 1 },
      { categoryId: reading._id, maxMarks: 40, order: 2 },
      { categoryId: writing._id, maxMarks: 40, order: 3 },
    ]);
    await getOrCreateSubject('Maths', [
      { categoryId: words._id, maxMarks: 20, order: 1 },
      { categoryId: writing._id, maxMarks: 80, order: 2 },
    ]);
    console.log('✅ Subjects Checked');

    // 4. Classes + Sections - Only if not exists
    for (const className of ['Class 1', 'Class 2', 'Class 3']) {
      let cls = await Class.findOne({ name: className });
      if (!cls) cls = await Class.create({ name: className });
      for (const secName of ['A', 'B']) {
        const secExists = await Section.findOne({ classId: cls._id, name: secName });
        if (!secExists) await Section.create({ classId: cls._id, name: secName });
      }
    }
    console.log('✅ Classes + Sections Checked');

    console.log('🎉 PROD Seed Done - Safe To Run Again');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Failed:', err.message);
    process.exit(1);
  }
};

seedProd();