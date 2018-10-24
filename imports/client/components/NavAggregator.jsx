import PropTypes from 'prop-types';
import React from 'react';
import Breadcrumb from 'react-bootstrap/lib/Breadcrumb';
import BreadcrumbItem from 'react-bootstrap/lib/BreadcrumbItem';
import RRBS from 'react-router-bootstrap';
import { _ } from 'meteor/underscore';

class NavAggregator {
  constructor() {
    this.mountedItems = [];
    this.mountedBars = [];
    const holder = this;

    class NavItem extends React.Component {
      // A component that doesn't render anything in the DOM, but uses lifecycle methods to add a
      // breadcrumb to be rendered in associated NavBar instances.
      componentDidMount() {
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

      // If not provided, guessed at from componentDidMount order, which
      // sometimes behaves as you'd expect from tree depth, and sometimes
      // doesn't.
      // If provided, gives the intended depth of the breadcrumb for sorting
      // purposes.  This is a hack to deal with the fact that componentDidMount
      // doesn't appear to run in a deterministic order, and the fact that we're
      // relying on mount order to maintain the render order for these breadcrumbs.
      depth: PropTypes.number,
    };
    NavItem.defaultProps = {
      children: null,
      depth: undefined,
    };

    class NavBar extends React.Component {
      // A component which materializes all the associated NavItems with Bootstrap breadcrumbs
      componentDidMount() {
        holder.mountedBars.push(this);
      }

      componentWillUnmount() {
        const index = holder.mountedBars.indexOf(this);
        holder.mountedBars.splice(index, 1);
      }

      render() {
        const navItemsAndImpliedOrder = holder.mountedItems.map((item, index) => {
          return {
            item,
            order: item.props.depth !== undefined ? item.props.depth : index,
          };
        });
        const sortedItems = _.sortBy(navItemsAndImpliedOrder, itemAndOrder => itemAndOrder.order);
        const navItems = sortedItems.map((itemAndOrder, index) => {
          const item = itemAndOrder.item;
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
