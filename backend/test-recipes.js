require('dotenv').config();
const app = require('./server');
const server = app.listen(5000, async () => {
  try {
    // 1. Register test user
    const reg = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name:'RecipeTest',email:'recipe-test@example.com',password:'password123',weight:70,height:175,age:30,gender:'Male',healthGoal:'Maintenance'})
    });
    const regData = await reg.json();
    const token = regData.token;
    console.log('Registered, got token');

    // 2. Test suggestions
    console.log('Fetching suggestions...');
    const sug = await fetch('http://127.0.0.1:5000/api/recipes/suggest', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    console.log('Suggest status:', sug.status);
    const sugData = await sug.json();
    console.log('Suggestions count:', Array.isArray(sugData) ? sugData.length : 'NOT ARRAY', typeof sugData);
    if (Array.isArray(sugData) && sugData.length > 0) {
      console.log('First recipe:', JSON.stringify(sugData[0]));
    } else {
      console.log('Suggestion response:', JSON.stringify(sugData).substring(0, 500));
    }

    // 3. Test save (if we got suggestions)
    if (Array.isArray(sugData) && sugData.length > 0) {
      const recipe = sugData[0];
      console.log('Saving recipe...');
      const save = await fetch('http://127.0.0.1:5000/api/recipes/save', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization': 'Bearer ' + token},
        body: JSON.stringify({
          spoonacularId: recipe.spoonacularId,
          title: recipe.title,
          image: recipe.image,
          sourceUrl: recipe.sourceUrl,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat
        })
      });
      console.log('Save status:', save.status);
      const saveData = await save.json();
      console.log('Save response keys:', Object.keys(saveData));
      if (saveData._id) {
        // 4. Test fetch saved
        const saved = await fetch('http://127.0.0.1:5000/api/recipes/saved', {
          headers: {'Authorization': 'Bearer ' + token}
        });
        console.log('Saved fetch status:', saved.status);
        const savedData = await saved.json();
        console.log('Saved count:', savedData.length);

        // 5. Test delete
        const del = await fetch('http://127.0.0.1:5000/api/recipes/saved/' + saveData._id, {
          method: 'DELETE',
          headers: {'Authorization': 'Bearer ' + token}
        });
        console.log('Delete status:', del.status);
      } else {
        console.log('Save failed:', JSON.stringify(saveData));
      }
    }

    // Cleanup
    const User = require('./models/User');
    await User.deleteOne({email:'recipe-test@example.com'});
    console.log('Cleaned up test user');
  } catch(e) { console.error('Error:', e.message, e.stack); }
  server.close(() => process.exit(0));
});
setTimeout(() => server.close(() => process.exit(1)), 30000);
