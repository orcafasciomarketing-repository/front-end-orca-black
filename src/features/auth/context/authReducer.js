const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_USER": {
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
      };
    }
    case "ALTER_TOKEN": {
      return {
        ...state,
        token: action.payload.token,
      };
    }
    case "REVOKE_DATA": {
      return {
        user: null,
        token: null,
        isLoading: false,
      };
    }
    case "SET_LOADING": {
      return {
        ...state,
        isLoading: false,
      };
    }
    default: {
      return state;
    }
  }
};

export default authReducer;
