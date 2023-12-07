const controller = {};
const User = require("../models").User;

controller.showIndex = async (req, res) => {
  res.render("index");
};

controller.showProfile = async(req, res) => {
  res.locals.user = req.session.user;
  res.render("my-profile");
};

controller.showLogin = async (req, res) => {
  let reqUrl = req.query.reqUrl ? req.query.reqUrl : "/";
  if (req.session.user) {
    return res.redirect(reqUrl);
  }
  res.render("auth-login", {
    layout: "auth",
    reqUrl,
    username: req.signedCookies.username,
    password: req.signedCookies.password,
  });
};

controller.login = async (req, res) => {

  let {username, password, rememberMe} = req.body;
  let user = await User.findOne({
    attributes: ["id", "username", "imagePath", "firstName", "lastName", "isAdmin"],
    where: {username, password}
  })
  if (user) {
    let reqUrl = req.body.reqUrl ? req.body.reqUrl : "/";
    req.session.user = user;
    if (rememberMe) {
      res.cookie("username", username, {
        maxAge: 60 * 60 * 1000,
        httpOnly: false,
        signed: true
      });
      res.cookie("password", password, {
        maxAge: 60 * 60 * 1000,
        httpOnly: true,
        signed: true
      });
    }
    return res.redirect(reqUrl);
  }
  return res.render("auth-login", {
    layout: "auth",
    message: "Invalid Username or Password!"
  });
}

controller.showRegister = (req, res) => {
  res.render("auth-register", { layout: "auth" });
};

controller.register = async (req, res) => {
  let {username, password, firstName, lastName, terms} = req.body;
  if (terms) {
    try {
      await User.create({username, password, firstName, lastName});
      return res.render("auth-login", {
        layout: "auth",
        message: "You can now login using your registration!"
      });
    } catch (error) {
      return res.render("auth-register", {
        layout: "auth",
        message: "Cannot register new account!"
      });
      console.error(error);
    }
  }
  return res.render("auth-register", {
    layout: "auth",
    message: "You must agree to our privacy policy & term!",
  });
}

controller.logout = async (req, res) => {
  req.session.destroy(function (error) {
    if (error) {
      console.error(error);
      return next(error);
    }
    res.redirect("/login");
  });
}

controller.isLoggedIn = async (req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  res.redirect(`/login?reqUrl=${req.originalUrl}`);
};

controller.updateProfile = async (req, res) => {
  let {firstName, lastName} = req.body;
  try {
    await User.update({
      firstName: firstName,
      lastName: lastName,
    }, {
      where: {id: req.session.user.id}
    });
    res.locals.user.firstName = firstName;
    res.locals.user.lastName = lastName;
    res.redirect('/profile');
  } catch (error) {
    res.send("Cannot edit your profile!")
    console.error(error);
  }
}

controller.changePassword = async (req, res) => {
  let {oldPassword, newPassword, confirmPassword} = req.body;
  if (newPassword != confirmPassword) {
    return res.render('my-profile', {
      message: "Confirm password not match new password"
    })
  }
  let user = await User.findOne({
    attributes: ['id'],
    where: {
      id: req.session.user.id,
      password: oldPassword
    }
  })
  if (!user) {
    return res.render('my-profile', {
      message: "Old password incorrect"
    })
  }
  try {
    await User.update({
      password: newPassword
    }, {
      where: {id: req.session.user.id}
    });
    return res.render('my-profile');
  } catch (error) {
    res.send("Cannot edit your profile!")
    console.error(error);
  }
}

module.exports = controller;
