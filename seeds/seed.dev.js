require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Category = require('../src/modules/categories/category.model');
const Subject = require('../src/modules/subjects/subject.model');
const Class = require('../src/modules/classes/class.model');
const Section = require('../src/modules/sections/section.model');

const seedDev = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB Connected - DEV');

    // ⚠️ DEV ONLY - Wipes all data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await Section.deleteMany({});
    console.log('🗑️ All Data Wiped - DEV');

    // 1. Admin
    await User.create({
      name: 'Admin',
      email: 'admin@suffa.com',
      phone: '9988776655',
      password: 'Admin@123',
      role: 'admin',
    });
    console.log('✅ Admin: 9988776655 / Admin@123');

    // 2. Categories
    const words = await Category.create({ name: 'Words' });
    const reading = await Category.create({ name: 'Reading' });
    const writing = await Category.create({ name: 'Writing' });

    // 3. Subjects
    await Subject.create({
      name: 'English',
      defaultCategories: [
        { categoryId: words._id, maxMarks: 20, order: 1 },
        { categoryId: reading._id, maxMarks: 40, order: 2 },
        { categoryId: writing._id, maxMarks: 40, order: 3 },
      ],
    });
    await Subject.create({
      name: 'Maths',
      defaultCategories: [
        { categoryId: words._id, maxMarks: 20, order: 1 },
        { categoryId: writing._id, maxMarks: 80, order: 2 },
      ],
    });
    console.log('✅ Categories + Subjects');

    // 4. Classes + Sections
    for (const className of ['Class 1', 'Class 2', 'Class 3']) {
      const cls = await Class.create({ name: className });
      await Section.create({ classId: cls._id, name: 'A' });
      await Section.create({ classId: cls._id, name: 'B' });
    }
    console.log('✅ Classes + Sections');

    // 5. Demo Teacher + Student - Dev only, for testing
    const teacherUser = await User.create({
      name: 'Ms. Aisha',
      email: 'aisha@suffa.com',
      phone: '8888888888',
      password: 'Teacher@123',
      role: 'teacher',
    });
    const Teacher = require('../src/modules/teachers/teacher.model');
    await Teacher.create({ userId: teacherUser._id, qualification: 'B.Ed', gender: 'Female' });
    console.log('✅ Demo Teacher: 8888888888 / Teacher@123');

    console.log('🎉 DEV Seed Done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Failed:', err.message);
    process.exit(1);
  }
};

seedDev();
