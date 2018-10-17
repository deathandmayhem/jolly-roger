import PropTypes from 'prop-types';
import React from 'react';
import { Breadcrumb, BreadcrumbItem } from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';

class NavAggregator {
  constructor() {
    this.mountedItems = [];
    this.mountedBars = [];
    const holder = this;

    class NavItem extends React.Component {
      // A component that doesn't render anything in the DOM, but uses lifecycle methods to add a
      // breadcrumb to be rendered in associated NavBar instances.
      componentWillMount() {
        holder.mountedItems.push(this);
        holder.forceUpdateNavbars();
      }

      componentDidUpdate() {
        holder.forceUpdateNavbars();
      }

      componentWillUnmount() {
        const index = holder.mountedItems.indexOf(this);
        holder.mountedItems.splice(index, 1);
        holder.forceUpdateNavbars();
      }

      render() {
        if (this.props.children) {
          return React.Children.only(this.props.children);
        } else {
          return null;
        }
      }
    }
    /* eslint-disable react/no-unused-prop-types */
    NavItem.propTypes = {
      // key that we want to place on the breadcrumb
      itemKey: PropTypes.string.isRequired,
      // Route to which this item should link (if not the final item)
      to: PropTypes.string.isRequired,
      // Text to place in the breadcrumb
      label: PropTypes.string.isRequired,
      children: PropTypes.element,
    };
    NavItem.defaultProps = {
      children: null,
    };

    class NavBar extends React.Component {
      // A component which materializes all the associated NavItems with Bootstrap breadcrumbs
      componentWillMount() {
        holder.mountedBars.push(this);
      }

      componentWillUnmount() {
        const index = holder.mountedBars.indexOf(this);
        holder.mountedBars.splice(index, 1);
      }

      render() {
        const navItems = holder.mountedItems.map((item, index) => {
          const { to, label, itemKey } = item.props;
          const isLast = (index === (holder.mountedItems.length - 1));
          if (isLast) {
            return (
              <this.props.itemComponentClass key={itemKey} className="jr-breadcrumb" active>
                {label}
              </this.props.itemComponentClass>
            );
          } else {
            return (
              <RRBS.LinkContainer key={itemKey} to={to} active={false}>
                <this.props.itemComponentClass className="jr-breadcrumb">
                  {label}
                </this.props.itemComponentClass>
              </RRBS.LinkContainer>
            );
          }
        });

        return (
          <this.props.componentClass className="nav-breadcrumbs">
            {navItems}
          </this.props.componentClass>
        );
      }
    }
    NavBar.propTypes = {
      // Override the type of the container
      componentClass: PropTypes.func,
      // Override the type of the items
      itemComponentClass: PropTypes.func,
    };
    NavBar.defaultProps = {
      componentClass: Breadcrumb,
      itemComponentClass: BreadcrumbItem,
    };

    this.NavItem = NavItem;
    this.NavBar = NavBar;
  }

  forceUpdateNavbars() {
    this.mountedBars.forEach((aggregate) => {
      aggregate.forceUpdate();
    });
  }
}

export default NavAggregator;
